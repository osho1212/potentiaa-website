HERO ARTWORK
============

Served:   module.webp        1524x1600, 77 KB, transparent
Source:   "hero tilted cube.png"   3375x4219, 1.9 MB   <- CURRENT
Previous: Potentiaa-3D-Blocks-Transparent-4K.png  3929x4096, 2.9 MB

components/sections/Hero.tsx points at module.webp, and its width/height
attributes must match the numbers above or the fold will reflow on load.

Regenerate with:

    magick "hero tilted cube.png" -trim +repage \
      -bordercolor none -border 158 -resize 1600x1600 -strip png32:- \
      | cwebp -q 88 -alpha_q 100 -m 6 -o module.webp -- -

The -trim and -border matter. The delivered file carried 854px of empty space
above the object and 723 below, so used as-is the artwork sat off-centre in its
own box and rendered smaller than the layout asked for. Trimming to the artwork
and adding an even 158px back puts the padding under our control - the CSS
decides how big the object is, not whatever margin the render happened to have.

1600 on the long side because the hero draws the artwork at most ~700 CSS px
wide, so this still has headroom at 2x device pixel ratio.
