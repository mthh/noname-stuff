
/**
* Function triggered when the user click on the "zoom by tracing a rectangle"
* button.
* If the feature is already active, it disable it. Otherwise it enable it.
*
* @return {void}
*
*/
const handleZoomRect = function () {
  const b = map.select('.brush');
  if (b.node()) {
    b.remove();
  } else {
    makeZoomRect();
  }
};

/**
* Function handling the click on the map and the brush effect when
* the "zoom by tracing a rectangle" is enabled.
* It may fail on some projections when the user click outside of the sphere.
*
* @return {void}
*/
const makeZoomRect = function () {
  if (!proj.invert) return;
  function idled() { idleTimeout = null; }
  function brushended() {
    const s = d3.event.selection;
    if (!s) {
      if (!idleTimeout) {
        idleTimeout = setTimeout(idled, idleDelay);
        return idleTimeout;
      }
    } else {
      const x_min = s[0][0],
        x_max = s[1][0];
      const y_min = s[1][1],
        y_max = s[0][1];
      const transform = d3.zoomTransform(svg_map),
        z_trans = [transform.x, transform.y],
        z_scale = transform.k;

      const pt1 = proj.invert([(x_min - z_trans[0]) / z_scale, (y_min - z_trans[1]) / z_scale]),
        pt2 = proj.invert([(x_max - z_trans[0]) / z_scale, (y_max - z_trans[1]) / z_scale]);
      const path_bounds = path.bounds({ type: 'MultiPoint', coordinates: [pt1, pt2] });
        // Todo : use these two points to make zoom on them
      map.select('.brush').call(brush.move, null);

      const zoom_scale = 0.95 / Math.max(
        (path_bounds[1][0] - path_bounds[0][0]) / w, (path_bounds[1][1] - path_bounds[0][1]) / h);
      const zoom_translate = [
        (w - zoom_scale * (path_bounds[1][0] + path_bounds[0][0])) / 2,
        (h - zoom_scale * (path_bounds[1][1] + path_bounds[0][1])) / 2,
      ];
      svg_map.__zoom.k = zoom_scale;
      svg_map.__zoom.x = zoom_translate[0];
      svg_map.__zoom.y = zoom_translate[1];
      zoom_without_redraw();
    }
  }

  const brush = d3.brush().on('end', brushended);
  let idleTimeout,
    idleDelay = 350;
  map.append('g')
        .attr('class', 'brush')
        .call(brush);
};
