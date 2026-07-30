# System-level dependencies for Replit's Nix environment.
# Additive: has no effect on local macOS development.
#
# Node 20 is the supported LTS for Next.js 14. The extra libs below are the
# native-build/runtime dependencies for this repo's heavy packages:
#   - sharp            -> libvips (pkgs.vips)
#   - @napi-rs/canvas  -> cairo, pango, libjpeg, giflib, librsvg, pixman
#   - remotion render  -> ffmpeg + headless chromium (chromium)
#   - better-sqlite3   -> compiles via node-gyp (needs python3, pkg-config, make)
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm

    # Build toolchain for native node modules (better-sqlite3, etc.)
    pkgs.python3
    pkgs.pkg-config
    pkgs.gnumake
    pkgs.gcc

    # sharp
    pkgs.vips

    # @napi-rs/canvas (skia/cairo stack)
    pkgs.cairo
    pkgs.pango
    pkgs.libjpeg
    pkgs.giflib
    pkgs.librsvg
    pkgs.pixman

    # Remotion server-side rendering (video export) — heavy, optional for
    # frontend-only collaboration. Remove these two if you only need the UI.
    pkgs.ffmpeg
    pkgs.chromium
  ];

  # Some prebuilt binaries (sharp, @napi-rs/canvas) dlopen shared libs at
  # runtime; expose them on the loader path.
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.vips
      pkgs.cairo
      pkgs.pango
      pkgs.libjpeg
      pkgs.giflib
      pkgs.librsvg
      pkgs.pixman
    ];
    # Point remotion at the Nix-provided chromium instead of downloading one.
    REMOTION_CHROME_EXECUTABLE = "${pkgs.chromium}/bin/chromium";
  };
}
