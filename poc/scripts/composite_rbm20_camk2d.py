#!/usr/bin/env python3
"""Composite the rbm20-camk2d gallery video from poc/out/rbm20-camk2d/shots.json.
Static figures (no push-in), PNG overlays (no drawtext), white letterbox, 16:9.
Output: poc/out/rbm20-camk2d/rbm20_camk2d_final.mp4
"""
import json, os, subprocess, sys

ROOT="/Users/batoolsalman/Downloads/Sensationalize Science"; os.chdir(ROOT)
BASE="poc/out/rbm20-camk2d"; SEG=f"{BASE}/segments"; OVL=f"{BASE}/overlays"
os.makedirs(SEG, exist_ok=True)
W,H,FPS=1920,1080,30
plan=json.load(open(f"{BASE}/shots.json")); shots=plan["shots"]

def dur(p):
    r=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True)
    try: return float(r.stdout.strip())
    except: return 0.0
NORM=(f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps={FPS}")

def run(cmd):
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode!=0: print("FFMPEG ERROR:\n",p.stderr[-1800:]); sys.exit(1)

def build(sid,main_inputs,base_filter,overlays,audio_input,T):
    inputs=list(main_inputs)
    for (png,*_ ) in overlays: inputs+=["-loop","1","-i",f"{OVL}/{png}"]
    a_index=1+len(overlays); inputs+=audio_input
    fc=[base_filter]; cur="b0"
    for i,(png,fis,fid,fos,fod) in enumerate(overlays):
        fade=f"format=rgba,fade=in:st={fis}:d={fid}:alpha=1"
        if fos is not None: fade+=f",fade=out:st={fos}:d={fod}:alpha=1"
        fc.append(f"[{i+1}:v]{fade}[o{i}]"); fc.append(f"[{cur}][o{i}]overlay=0:0[b{i+1}]"); cur=f"b{i+1}"
    fc.append(f"[{cur}]format=yuv420p[v]")
    if audio_input and "anullsrc" in " ".join(audio_input): amap=f"{a_index}:a"
    else: fc.append(f"[{a_index}:a]adelay=150|150,apad[a]"); amap="[a]"
    out=f"{SEG}/seg_{sid}.mp4"
    run(["ffmpeg","-y","-loglevel","error"]+inputs+["-filter_complex",";".join(fc),"-map","[v]","-map",amap,
         "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS),"-c:a","aac","-ar","44100","-t",f"{T}",out])
    return out

concat=[]
for s in shots:
    sid=s["id"]; kind=s["kind"]; ov=[]
    if s.get("sectionLabel"): ov.append((f"label_{s['sectionLabel']}.png",0.3,0.5,3.2,0.6))
    if kind=="title":
        src=["-loop","1","-t","2.0","-i",f"{BASE}/title_card.png"]
        aud=["-f","lavfi","-t","2.0","-i","anullsrc=r=44100:cl=stereo"]
        out=build(sid,src,f"[0:v]{NORM},format=yuv420p[b0]",[],aud,2.0)
        print(f"{sid:5} title 2.0s"); concat.append(out); continue
    nd=dur(f"{BASE}/audio/{sid}.mp3")
    if kind=="figure":
        T=round(nd+0.6,2)
        ov.append((f"chip_{s['figureLabel'].replace(' ','_')}.png",0.3,0.5,None,0))
        base=f"[0:v]{NORM}[b0]"   # static figure
        src=["-loop","1","-t",f"{T}","-i",f"{BASE}/figures/{sid}.png"]; aud=["-i",f"{BASE}/audio/{sid}.mp3"]
        out=build(sid,src,base,ov,aud,T); print(f"{sid:5} figure {T:.1f}s ({s['figureLabel']})"); concat.append(out); continue
    # video
    src_path=f"{BASE}/clips/{sid}__kling.mp4"
    if not os.path.exists(src_path): print(f"{sid} MISSING CLIP"); sys.exit(2)
    cd=dur(src_path); T=round(nd+0.8,2)
    if s.get("onscreen"): ov.append(("question.png",0.5,0.6,round(T-0.6,2),0.5))
    pre=f"tpad=stop_mode=clone:stop_duration={round(T-cd,2)}," if cd<T else ""
    base=f"[0:v]{pre}{NORM}[b0]"
    out=build(sid,["-i",src_path],base,ov,["-i",f"{BASE}/audio/{sid}.mp3"],T)
    print(f"{sid:5} video {T:.1f}s (clip {cd:.1f}s)"); concat.append(out)

listf=f"{SEG}/concat.txt"; open(listf,"w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in concat))
final=f"{BASE}/rbm20_camk2d_final.mp4"
run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",listf,"-c","copy",final])
print("\nFINAL:",final,f"{dur(final):.1f}s")
