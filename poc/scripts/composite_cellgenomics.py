#!/usr/bin/env python3
"""Composite the cellgenomics gallery video from shots.json.

Video beats  -> Kling clip + narration (hold last frame / trim to fit).
Figure beats -> real cropped paper figure, slow push-in, citation chip.
Title beat   -> white citation card, 2s.
Section labels + the s3 on-screen question are PNG overlays (this ffmpeg has
no drawtext), faded on their alpha channel and composited with `overlay`.
Output: 1920x1080, white letterbox, h264/aac -> poc/out/cellgenomics_final.mp4
"""
import json, os, subprocess, sys

ROOT = "/Users/batoolsalman/Downloads/Sensationalize Science"
os.chdir(ROOT)
SEG = "poc/out/segments"; os.makedirs(SEG, exist_ok=True)
OVL = "poc/out/overlays"
W, H, FPS = 1920, 1080, 30

plan = json.load(open("poc/out/shots.json"))
shots = plan["shots"]

def dur(path):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                        "-of","csv=p=0",path], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except: return 0.0

NORM = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps={FPS}")

CHIP = {"f1":"Figure_1A","f5":"Figure_3A","f2":"Figure_4","f3":"Figure_5",
        "f4a":"Figure_6H","f4b":"Figure_6H"}

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        print("FFMPEG ERROR:\n", p.stderr[-1800:]); sys.exit(1)

def build(sid, main_inputs, base_filter, overlays, audio_input, T):
    """overlays: list of (png, fade_in_st, fade_in_d, fade_out_st|None, fade_out_d)"""
    inputs = list(main_inputs)                 # main video input args
    ovl_idx = []
    for (png,*_ ) in overlays:
        inputs += ["-loop","1","-i",f"{OVL}/{png}"]; ovl_idx.append(len(ovl_idx))
    # audio input args appended last
    a_index = 1 + len(overlays)                # main is 0, overlays 1..n, audio next
    inputs += audio_input
    fc = [base_filter]                         # produces [b0]
    cur = "b0"
    for i,(png,fis,fid,fos,fod) in enumerate(overlays):
        inp = i+1                              # input stream index for this overlay
        fade = f"format=rgba,fade=in:st={fis}:d={fid}:alpha=1"
        if fos is not None: fade += f",fade=out:st={fos}:d={fod}:alpha=1"
        fc.append(f"[{inp}:v]{fade}[o{i}]")
        fc.append(f"[{cur}][o{i}]overlay=0:0[b{i+1}]")
        cur = f"b{i+1}"
    fc.append(f"[{cur}]format=yuv420p[v]")
    # audio
    if audio_input and "anullsrc" in " ".join(audio_input):
        amap = f"{a_index}:a"; afilt=None
    else:
        fc.append(f"[{a_index}:a]adelay=150|150,apad[a]"); amap="[a]"
    out = f"{SEG}/seg_{sid}.mp4"
    cmd = ["ffmpeg","-y","-loglevel","error"] + inputs + \
          ["-filter_complex",";".join(fc),"-map","[v]","-map",amap,
           "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS),
           "-c:a","aac","-ar","44100","-t",f"{T}",out]
    run(cmd); return out

concat=[]
for s in shots:
    sid=s["id"]; kind=s["kind"]
    ov=[]
    if s.get("sectionLabel"):
        ov.append((f"label_{s['sectionLabel']}.png",0.3,0.5,3.2,0.6))

    if kind=="title":
        src=["-loop","1","-t","2.0","-i","poc/out/title_card.png"]
        aud=["-f","lavfi","-t","2.0","-i","anullsrc=r=44100:cl=stereo"]
        out=build(sid,src,f"[0:v]{NORM},format=yuv420p[b0]",[],aud,2.0)
        # build() adds [v]; but with no overlays base already labeled b0 then final. fix: reuse generic
        print(f"{sid:5} title  2.0s"); concat.append(out); continue

    nd=dur(f"poc/out/audio/{sid}.mp3")

    if kind=="figure":
        T=round(nd+0.6,2)
        ov.append((f"chip_{CHIP[sid]}.png",0.3,0.5,None,0))
        # static figure — no Ken Burns / push-in
        base=f"[0:v]{NORM}[b0]"
        src=["-loop","1","-t",f"{T}","-i",f"poc/out/figures/{sid}.png"]
        aud=["-i",f"poc/out/audio/{sid}.mp3"]
        out=build(sid,src,base,ov,aud,T)
        print(f"{sid:5} figure {T:.1f}s ({s.get('figureLabel')})"); concat.append(out); continue

    # video
    src_path=f"poc/out/clips/{sid}__kling.mp4"
    if not os.path.exists(src_path): print(f"{sid} MISSING"); sys.exit(2)
    cd=dur(src_path); T=round(nd+0.8,2)
    if s.get("onscreen"):
        ov.append(("question.png",0.5,0.6,round(T-0.6,2),0.5))
    pre=""
    if cd<T: pre=f"tpad=stop_mode=clone:stop_duration={round(T-cd,2)},"
    base=f"[0:v]{pre}{NORM}[b0]"
    src=["-i",src_path]; aud=["-i",f"poc/out/audio/{sid}.mp3"]
    out=build(sid,src,base,ov,aud,T)
    print(f"{sid:5} video  {T:.1f}s (clip {cd:.1f}s)"); concat.append(out)

listf=f"{SEG}/concat.txt"
open(listf,"w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in concat))
final="poc/out/cellgenomics_final.mp4"
run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",listf,"-c","copy",final])
print("\nFINAL:",final,f"{dur(final):.1f}s")
