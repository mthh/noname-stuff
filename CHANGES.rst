Changes
=======

0.5.0 (2017-08-24)
------------------

- Allow to create, use (and re-use) custom palette for choropleth maps.

- Allow to hide/display the head of arrows.

- Notable change: some old project-files may no longer be loaded correctly (the impact is really quite limited, but precisely, the overlay order of layout features could be incorrect when opening these old project-files).

- Fix error with legend customization box after changing the layer name.

- Re-allow to display the table of the joined dataset and improve the table layout.

- Improve handling of fields containing mixed numerical and not numerical values for some representations.


0.4.1 (2017-08-14)
------------------

- Fix background color when exporting to svg.

- Fix property box not opening on pictograms layer.

- Don't apply clipping path to pictograms layers nor symbols layers.

- Change the overlay displayed when a layer is loading.


0.4.0 (2017-07-24)
------------------

- Fix error occuring on some representations when using a target layer with empty geometries and warn the user if it's the case.

- Introduce a new representation, waffle map, for mapping two (or more) comparable stocks together.


0.3.7 (2017-07-17)
------------------

- Fix error on jointure.

- Fix location of red square when moving proportionnal symbols.

- Fix legend size on links and discontinuities when zooming.


0.3.6 (2017-06-30)
------------------

- Fix selection on links map (was only working with specific field name).


0.3.5 (2017-06-28)
------------------

- Allow to edit the location of proportionnal symbols

- Slightly change the behavior with proj4 projections when layers are added/removed


0.3.4 (2017-06-22)
------------------

- Fix the "auto-align" feature behavior for the new text annotation.

- Fix graticule not showing correctly when opening result svg file with Adobe Illustrator.

- Fix the jointure failing since 0.3.3.

- New: Allow to change the name of the layers at any time.


0.3.3 (2017-06-15)
------------------

- Allow to add more than one sphere background (#26).

- Add default projection for sample basemaps.


0.3.2 (2017-06-09)
------------------

- Fix text annotation behavior when clicking on "cancel".

- Fix legend displaying "false" after reloading (when size was not fixed).

- Switch color between "OK" and "Cancel" buttons on modal box.


0.3.1 (2017-06-08)
------------------

- Fix how values are retrieved for cartogram.


0.3.0 (2017-06-07)
------------------

- CSV reading: fix the recognition of some encodings + fix the reading of files whose first column contains an empty name.

- Modifies text annotations (internally): now allows the selection of the alignment (left, center, right) of the text within the block.

- Modifies versioning to follow SemVer more strictly.

- Fix Lambert 93 projection, accessible from the menu of projections (the display was non-existent at certain levels of zoom with this projection).

- Removes two projections that could be considered redundant.

- Fix bug with choice of pictogram size.

- Fix bug in the order in which some features are reloaded from project file.
