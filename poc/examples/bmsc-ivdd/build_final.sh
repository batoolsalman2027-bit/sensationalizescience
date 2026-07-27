#!/bin/bash
set -e
eval "$(/opt/homebrew/bin/brew shellenv)"
cd "/Users/batoolsalman/Downloads/Sensationalize Science"
SP="/private/tmp/claude-501/-Users-batoolsalman-Downloads-Sensationalize-Science/fbf22dbf-a7b7-47b3-ad71-f056667e4c59/scratchpad" 2>/dev/null || true
SP="/private/tmp/claude-501/-Users-batoolsalman-Downloads-Sensationalize-Science/fbf22dbf-a7b7-47b3-ad71-f056867e4c59/scratchpad"
TMP="$SP/segv6"; mkdir -p "$TMP"; rm -f "$TMP"/*.mp4 "$SP/concat_v6.txt"
vfilt="fps=24,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1"

# id | source | mode | overlay-label (empty = none)
entries=(
"title|poc/out/title_card.mp4|title|"
"m1|poc/out/clips/m1__kling.mp4|video|poc/out/label_intro.png"
"m2|poc/out/clips/m2__kling.mp4|video|"
"m3|poc/out/clips/m3__kling.mp4|video|"
"meth1|poc/out/clips/meth1__kling.mp4|video|poc/out/label_methods.png"
"meth2|poc/out/clips/meth2__kling.mp4|video|"
"meth3|poc/out/clips/meth3__kling.mp4|video|"
"res1|poc/out/clips/res1__kling.mp4|video|poc/out/label_results.png"
"res2|poc/out/clips/res2__kling.mp4|video|"
"res3|poc/out/fig3_manim.mp4|hold|"
"res4|poc/out/stat3_diagram.mp4|hold|"
"res5|poc/out/fig2_manim.mp4|hold|"
"res6|poc/out/clips/res6__kling.mp4|video|"
"sig1|poc/out/clips/sig1__kling.mp4|video|"
"sig2|poc/out/clips/sig2__kling.mp4|video|"
)

for e in "${entries[@]}"; do
  IFS='|' read -r id vid mode ov <<< "$e"
  seg="$TMP/seg_$id.mp4"; vdur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$vid")
  if [ "$mode" = "title" ]; then
    ffmpeg -y -loglevel error -i "$vid" -f lavfi -i anullsrc=r=44100:cl=stereo \
      -filter_complex "[0:v]${vfilt}[v]" -map "[v]" -map 1:a -t "$vdur" \
      -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 "$seg"
    printf "%-7s CARD   %.1fs\n" "$id" "$vdur"
  else
    aud="poc/out/audio/$id.mp3"; adur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$aud")
    if [ "$mode" = "hold" ]; then
      T=$(python3 -c "print(round($adur+0.5,3))"); pad=$(python3 -c "print(round(max(0.0,$T-$vdur),3))")
      ffmpeg -y -loglevel error -i "$vid" -i "$aud" \
        -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${pad},${vfilt}[v];[1:a]adelay=120|120,apad[a]" \
        -map "[v]" -map "[a]" -t "$T" -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 "$seg"
      printf "%-7s HOLD   %.1fs\n" "$id" "$T"
    else
      T="$vdur"
      if python3 -c "exit(0 if $adur> $T else 1)"; then f=$(python3 -c "print(round($adur/$T,4))"); afilt="atempo=${f}"; else afilt="apad"; fi
      if [ -n "$ov" ]; then
        # fade the label in at 0.4s, out near the end of its ~4s presence
        fo=$(python3 -c "print(round(min($T-0.8, 3.6),3))")
        ffmpeg -y -loglevel error -i "$vid" -i "$aud" -i "$ov" \
          -filter_complex "[0:v]${vfilt}[base];[2:v]scale=1280:720,format=rgba,fade=in:st=0.4:d=0.5:alpha=1,fade=out:st=${fo}:d=0.6:alpha=1[lbl];[base][lbl]overlay=0:0[v];[1:a]${afilt}[a]" \
          -map "[v]" -map "[a]" -t "$T" -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 "$seg"
        printf "%-7s VIDEO+LBL %.1fs\n" "$id" "$T"
      else
        ffmpeg -y -loglevel error -i "$vid" -i "$aud" \
          -filter_complex "[0:v]${vfilt}[v];[1:a]${afilt}[a]" \
          -map "[v]" -map "[a]" -t "$T" -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 "$seg"
        printf "%-7s VIDEO  %.1fs\n" "$id" "$T"
      fi
    fi
  fi
  echo "file '$seg'" >> "$SP/concat_v6.txt"
done

ffmpeg -y -loglevel error -f concat -safe 0 -i "$SP/concat_v6.txt" -c copy poc/out/doc_final_v6.mp4
echo "---"; ffprobe -v error -show_entries format=duration -of csv=p=0 poc/out/doc_final_v6.mp4
ls -la poc/out/doc_final_v6.mp4
