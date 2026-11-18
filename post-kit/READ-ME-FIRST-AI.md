# Instructions for the AI: making an Emerald Forest Furnishings post

You are helping Noah, a woodworker in Black Mountain, NC, make a social
media post (Instagram and Facebook) from his own photo. This zip holds
everything you need:

- `brand-brief.txt`: who the business is, how it writes, colours,
  fonts and rules. Read it before writing anything.
- `make_post.py`: lays out the post. Needs Python 3 and Pillow.
- `fonts/`, `logos/`, `icons/`: used by the script. Don't swap them.

Start by unzipping this file with your code tool and reading every
file in it. Don't answer from the file names alone.

## The one rule that matters most

Never generate, redraw, extend, "enhance" or otherwise change the
photo of the woodwork. It is proof of real work. Only the script may
touch it, and the script only crops it to size and adds a dark band,
text, the logo and icons. Do not use an image-generation tool on his
photo, even if asked to "make it look better". If he asks, explain
why and offer brightness or crop advice instead.

## Steps

1. Unzip this file and read `brand-brief.txt`.
2. Look at Noah's photo(s). If he hasn't said, ask in one short
   message: what the piece is, the wood, and the town. Don't guess
   wood species or towns.
3. Write, in the brand voice:
   - a headline: Title Case, under 8 words, no emoji
   - an optional one-line subline (wood, town, or one detail)
   - the caption: 2 to 4 short sentences, then a call to action to
     call (828) 424-5401 or visit emeraldforestfurnishings.com for a
     free estimate, then up to 5 local hashtags
4. Pick the layout:
   - `photo`: one photo of a finished piece (most posts)
   - `before-after`: two photos, before then after
   - `review`: a customer quote, no photo needed
5. Pick the size: `portrait` (1080x1350) for feed posts unless he asks
   otherwise, `square` (1080x1080), or `story` (1080x1920).
6. Run it from the unzipped folder, for example:

   ```
   python make_post.py photo --photo /path/to/photo.jpg --headline "Walnut Spiral Staircase" --subline "Hand-turned balusters, Black Mountain" --size portrait --out post.png
   python make_post.py before-after --before before.jpg --after after.jpg --headline "Alcove to Wine Bar" --size portrait
   python make_post.py review --quote "Noah has excellent attention to detail." --name "Mike W" --size square
   ```

7. Show him the image, give him the caption to copy, and offer one
   alternative headline. If text covers the important part of the
   photo, say so and suggest a different photo or the square size.

## If you can't run Python

Don't fake the image. Give him the headline, subline and caption, and
these Canva steps instead: new design 1080x1350; his photo full size;
a black (#060907) gradient over the bottom third; headline in Libre
Caslon Text bold, gold #c99432, bottom left; subline in Jost,
#d6cdb9; phone number and website small underneath; `logos/logo-light.png`
small in the top right. The icons in `icons/` are PNGs he can drop in.

## Reviews

Use first name and last initial only. Shorten long reviews to under 30
words without changing what they mean, and tell Noah what you cut.
