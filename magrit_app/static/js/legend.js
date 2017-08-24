/**
* Function called on clicking on the legend button of each layer
* - toggle the visibility of the legend (or create the legend if doesn't currently exists)
*
* @param {String} layer - The layer name
* @returns {void}
*/
function handle_legend(layer) {
  const state = current_layers[layer].renderer;
  if (state != undefined) {
    const class_name = ['.lgdf', _app.layer_to_id.get(layer)].join('_');
    const legends = svg_map.querySelectorAll(class_name);
    if (legends.length > 0) {
      if (legends[0].getAttribute('display') == null) {
        Array.prototype.forEach.call(legends, el => el.setAttribute('display', 'none'));
      } else {
        Array.prototype.forEach.call(legends, el => el.removeAttribute('display'));
        // Redisplay the legend(s) and also
        // verify if still in the visible part
        // of the map, if not, move them in:
        // .. so it's actually a feature if the legend is redrawn on its origin location
        // after being moved too close to the outer border of the map :
        const tol = 7.5;
        const { x: x0, y: y0 } = get_map_xy0();
        const limit_left = x0 - tol;
        const limit_right = x0 + +w + tol;
        const limit_top = y0 - tol;
        const limit_bottom = y0 + +h + tol;

        for (let i = 0; i < legends.length; i++) {
          const bboxLegend = legends[i].getBoundingClientRect();
          if (bboxLegend.left < limit_left || bboxLegend.left > limit_right
                  || bboxLegend.top < limit_top || bboxLegend.top > limit_bottom) {
            legends[i].setAttribute('transform', 'translate(0, 0)');
          }
        }
      }
    } else {
      createLegend(layer, '');
      up_legends();
    }
  }
}

/**
* Function called on the first click on the legend button of each layer
* - delegate legend creation according to the type of function
*
* @param {String} layer - The layer name
* @param {String} title - The desired title (default: empty - can be modified later)
*
*/
function createLegend(layer, title) {
  const renderer = current_layers[layer].renderer,
    field = current_layers[layer].rendered_field,
    field2 = current_layers[layer].rendered_field2,
    type_layer = current_layers[layer].type;
  let el,
    el2;

  const lgd_pos = getTranslateNewLegend();

  if (renderer.indexOf('Choropleth') > -1 || renderer.indexOf('Gridded') > -1
            || renderer.indexOf('Stewart') > -1 || renderer.indexOf('TypoSymbols') > -1) {
    el = createLegend_choro(layer, field, title, field, 0);
  } else if (renderer.indexOf('Categorical') > -1) {
    el = createLegend_choro(layer, field, title, field, 4);
  } else if (renderer.indexOf('Links') !== -1
          || renderer.indexOf('DiscLayer') !== -1) {
    el = createLegend_discont_links(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbolsChoro') !== -1) {
    el = createLegend_choro(layer, field2, title, field2, 0);
    el2 = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field)
                                : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbolsTypo') !== -1) {
    el = createLegend_choro(layer, field2, title, field2, 4);
    el2 = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field)
                                : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbols') !== -1) {
    el = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field)
                               : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('TwoStocksWaffle') !== -1) {
    el = createLegend_waffle(layer, field, title, '');
  } else {
    swal('Oops..',
         `${i18next.t('No legend available for this representation')}.<br>${
          i18next.t('Want to make a <a href="/">suggestion</a> ?')}`,
         'warning');
    return;
  }

  if (el && lgd_pos && lgd_pos.x) {
    el.attr('transform', `translate(${lgd_pos.x},${lgd_pos.y})`);
  }
  pos_lgds_elem.set(`${el.attr('id')} ${el.attr('class')}`, el.node().getBoundingClientRect());
  if (el2) {
    const prev_bbox = el.node().getBoundingClientRect(),
      dim_h = lgd_pos.y + prev_bbox.height,
      dim_w = lgd_pos.x + prev_bbox.width;
    const lgd_pos2 = getTranslateNewLegend();
    if (lgd_pos2.x !== lgd_pos.x || lgd_pos2.y !== lgd_pos.y) {
      el2.attr('transform', `translate(${lgd_pos2.x},${lgd_pos2.y})`);
    } else if (dim_h < h) {
      el2.attr('transform', `translate(${lgd_pos.x},${dim_h})`);
    } else if (dim_w < w) {
      el2.attr('transform', `translate(${dim_w},${lgd_pos.y})`);
    }
    pos_lgds_elem.set(`${el2.attr('id')} ${el2.attr('class')}`, el2.node().getBoundingClientRect());
  }
}

function up_legend(legend_node) {
  const lgd_features = svg_map.querySelectorAll('.legend'),
    nb_lgd_features = +lgd_features.length;
  let self_position;

  for (let i = 0; i < nb_lgd_features; i++) {
    if (lgd_features[i].id === legend_node.id
          && lgd_features[i].classList === legend_node.classList) {
      self_position = i;
    }
  }
  // if (self_position === nb_lgd_features - 1) {
  //
  // } else {
  //   svg_map.insertBefore(lgd_features[self_position + 1], lgd_features[self_position]);
  // }
  if (!(self_position === nb_lgd_features - 1)) {
    svg_map.insertBefore(lgd_features[self_position + 1], lgd_features[self_position]);
  }
}

function down_legend(legend_node) {
  const lgd_features = svg_map.querySelectorAll('.legend'),
    nb_lgd_features = +lgd_features.length;
  let self_position;

  for (let i = 0; i < nb_lgd_features; i++) {
    if (lgd_features[i].id === legend_node.id
        && lgd_features[i].classList === legend_node.classList) {
      self_position = i;
    }
  }
  if (self_position !== 0) {
    svg_map.insertBefore(lgd_features[self_position], lgd_features[self_position - 1]);
  }
}

function make_legend_context_menu(legend_node, layer) {
  const context_menu = new ContextMenu();
  const getItems = () => [
    { name: i18next.t('app_page.common.edit_style'), action: () => { createlegendEditBox(legend_node.attr('id'), legend_node.attr('layer_name')); } },
    { name: i18next.t('app_page.common.up_element'), action: () => { up_legend(legend_node.node()); } },
    { name: i18next.t('app_page.common.down_element'), action: () => { down_legend(legend_node.node()); } },
    { name: i18next.t('app_page.common.hide'),
      action: () => {
        if (!(legend_node.attr('display') === 'none')) legend_node.attr('display', 'none');
        else legend_node.attr('display', null);
      } },
  ];
  legend_node.on('dblclick', () => {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    createlegendEditBox(legend_node.attr('id'), legend_node.attr('layer_name'));
  });

  legend_node.on('contextmenu', () => {
    context_menu.showMenu(d3.event,
                          document.querySelector('body'),
                          getItems());
  });
}

const make_red_line_snap = function (x1, x2, y1, y2, timeout = 750) {
  let current_timeout;
  return (function () {
    if (current_timeout) {
      clearTimeout(current_timeout);
    }
    map.select('.snap_line').remove();
    const line = map.append('line')
        .attrs({ x1, x2, y1, y2, class: 'snap_line' })
        .styles({ stroke: 'red', 'stroke-width': 0.7 });
    current_timeout = setTimeout((_) => { line.remove(); }, timeout);
  }());
};

const drag_legend_func = function (legend_group) {
  return d3.drag()
    .subject(function () {
      let t = d3.select(this),
        prev_translate = t.attr('transform'),
        snap_lines = get_coords_snap_lines(`${t.attr('id')} ${t.attr('class')}`);
      prev_translate = prev_translate ? prev_translate.slice(10, -1).split(',').map(f => +f) : [0, 0];
      return {
        x: t.attr('x') + prev_translate[0],
        y: t.attr('y') + prev_translate[1],
        map_locked: !!map_div.select('#hand_button').classed('locked'),
        map_offset: get_map_xy0(),
        snap_lines,
        offset: [legend_group.select('#under_rect').attr('x'), legend_group.select('#under_rect').attr('y')],
      };
    })
    .on('start', () => {
      d3.event.sourceEvent.stopPropagation();
      d3.event.sourceEvent.preventDefault();
      handle_click_hand('lock');
    })
    .on('end', () => {
      if (d3.event.subject && !d3.event.subject.map_locked) { handle_click_hand('unlock'); }
      legend_group.style('cursor', 'grab');
      pos_lgds_elem.set(`${legend_group.attr('id')} ${legend_group.attr('class')}`, legend_group.node().getBoundingClientRect());
    })
    .on('drag', () => {
      const Min = Math.min;
      const Max = Math.max;
      const new_value = [d3.event.x, d3.event.y];
      let prev_value = legend_group.attr('transform');
      prev_value = prev_value ? prev_value.slice(10, -1).split(',').map(f => +f) : [0, 0];

      legend_group.attr('transform', `translate(${new_value})`)
          .style('cursor', 'grabbing');

      const bbox_elem = legend_group.node().getBoundingClientRect(),
        map_offset = d3.event.subject.map_offset;
      let val_x = d3.event.x,
        val_y = d3.event.y,
        change;

      if (_app.autoalign_features) {
        const xy0 = get_map_xy0(),
          xmin = bbox_elem.left - xy0.x,
          xmax = bbox_elem.right - xy0.x,
          ymin = bbox_elem.top - xy0.y,
          ymax = bbox_elem.bottom - xy0.y;

        const snap_lines_x = d3.event.subject.snap_lines.x,
          snap_lines_y = d3.event.subject.snap_lines.y;
        for (let i = 0; i < snap_lines_x.length; i++) {
          if (Math.abs(snap_lines_x[i][0] - xmin) < 10) {
            const _y1 = Min(Min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
            const _y2 = Max(Max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
            make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y1, _y2);
            val_x = snap_lines_x[i][0] - d3.event.subject.offset[0];
            change = true;
          }
          if (Math.abs(snap_lines_x[i][0] - xmax) < 10) {
            const _y1 = Min(Min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
            const _y2 = Max(Max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
            make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y1, _y2);
            val_x = snap_lines_x[i][0] - bbox_elem.width - d3.event.subject.offset[0];
            change = true;
          }
          if (Math.abs(snap_lines_y[i][0] - ymin) < 10) {
            const x1 = Min(Min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
            const x2 = Max(Max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
            make_red_line_snap(x1, x2, snap_lines_y[i][0], snap_lines_y[i][0]);
            val_y = snap_lines_y[i][0] - d3.event.subject.offset[1];
            change = true;
          }
          if (Math.abs(snap_lines_y[i][0] - ymax) < 10) {
            const x1 = Min(Min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
            const x2 = Max(Max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
            make_red_line_snap(x1, x2, snap_lines_y[i][0], snap_lines_y[i][0]);
            val_y = snap_lines_y[i][0] - bbox_elem.height - d3.event.subject.offset[1];
            change = true;
          }
        }
      }

      if (bbox_elem.width < w && (bbox_elem.left < map_offset.x || bbox_elem.left + bbox_elem.width > map_offset.x + w)) {
        val_x = prev_value[0];
        change = true;
      }
      if (bbox_elem.height < h && (bbox_elem.top < map_offset.y || bbox_elem.top + bbox_elem.height > map_offset.y + h)) {
        val_y = prev_value[1];
        change = true;
      }
      if (change) {
        legend_group.attr('transform', `translate(${[val_x, val_y]})`);
      }
    });
};

function createLegend_waffle(layer, fields, title, subtitle, rect_fill_value, ratio_txt, note_bottom) {
  const space_elem = 18;
  const boxheight = 18;
  const boxwidth = 18;
  const boxgap = 12;
  const xpos = 30;
  const ypos = 30;
  const y_pos2 = ypos + space_elem;
  const tmp_class_name = ['legend', 'legend_feature', `lgdf_${_app.layer_to_id.get(layer)}`].join(' ');
  const nbVar = fields.length;
  const ref_colors = current_layers[layer].fill_color;
  const symbol = current_layers[layer].symbol;
  const size_symbol = current_layers[layer].size;
  let last_size;
  let last_pos;

  const legend_root = map.insert('g')
    .attrs({
      id: 'legend_root_waffle',
      class: tmp_class_name,
      transform: 'translate(0,0)',
      layer_name: layer,
    })
    .styles({
      cursor: 'grab',
      font: '11px "Enriqueta", arial, serif',
    });

  const rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text')
    .attrs(
      subtitle != '' ? { id: 'legendtitle', x: xpos + space_elem, y: ypos } : { id: 'legendtitle', x: xpos + space_elem, y: ypos + 15 } )
    .style('font', 'bold 12px "Enriqueta", arial, serif')
    .text(title || '');

  legend_root.insert('text')
    .attrs({ id: 'legendsubtitle', x: xpos + space_elem, y: ypos + 15 })
    .style('font', 'italic 12px "Enriqueta", arial, serif')
    .text(subtitle);

  const fields_colors = [];
  for (let i = 0; i < nbVar; i++) {
    fields_colors.push([fields[i], ref_colors[i]]);
  }

  const legend_elems = legend_root.selectAll('.legend')
    .append('g')
    .data(fields_colors)
    .enter()
    .insert('g')
    .attr('class', (d, i) => `lg legend_${i}`);

  legend_elems
    .append('rect')
    .attr('x', xpos + boxwidth)
    .attr('y', (d, i) => {
      last_pos = y_pos2 + (i * boxgap) + (i * boxheight);
      return last_pos;
    })
    .attrs({ width: boxwidth, height: boxheight })
    .styles(d => ({ fill: d[1], stroke: d[1] }));

  legend_elems
    .append('text')
    .attr('x', xpos + boxwidth * 2 + 10)
    .attr('y', (d, i) => y_pos2 + i * boxheight + (i * boxgap) + (boxheight * 2 / 3))
    .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
    .text(d => d[0]);

  const legend_symbol_size = legend_root.append('g');
  if (symbol === 'rect') {
    legend_symbol_size
      .insert('rect')
      .attrs({ x: xpos + boxwidth, y: last_pos + 2 * space_elem, width: size_symbol, height: size_symbol })
      .styles({ fill: 'lightgray', stroke: 'black', 'stroke-width': '0.8px' });
    legend_symbol_size
      .insert('text')
      .attrs({ x: xpos + boxwidth + space_elem + size_symbol, y: last_pos + 2 * space_elem + size_symbol / 2 + 5, id: 'ratio_txt' })
      .text(ratio_txt || ` = ${current_layers[layer].ratio}`);
    last_pos = last_pos + 3 * space_elem + size_symbol;
  } else {
    legend_symbol_size
      .insert('circle')
      .attrs({ cx: xpos + boxwidth + size_symbol, cy: last_pos + 2 * space_elem + size_symbol, r: size_symbol })
      .styles({ fill: 'lightgray', stroke: 'black', 'stroke-width': '0.8px' });
    legend_symbol_size
      .insert('text')
      .attrs({ x: xpos + boxwidth + space_elem + size_symbol * 2, y: last_pos + 2 * space_elem + size_symbol + 5, id: 'ratio_txt' })
      .text(ratio_txt || ` = ${current_layers[layer].ratio}`);
    last_pos = last_pos + 3 * space_elem + size_symbol * 2;
  }

  legend_root.append('g')
    .insert('text')
    .attrs({ id: 'legend_bottom_note', x: xpos + space_elem, y: last_pos })
    .style('font', '11px "Enriqueta", arial, serif')
    .text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));

  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function createLegend_discont_links(layer, field, title, subtitle, rect_fill_value, rounding_precision, note_bottom) {
  const space_elem = 18,
    boxgap = 12,
    xpos = 30,
    ypos = 30,
    y_pos2 = ypos + space_elem,
    tmp_class_name = ['legend', 'legend_feature', `lgdf_${_app.layer_to_id.get(layer)}`].join(' '),
    breaks = current_layers[layer].breaks,
    nb_class = breaks.length;

  if (rounding_precision === undefined) {
    const b_val = breaks.map((v, i) => v[0][0]).concat(breaks[nb_class - 1][0][1]);
    rounding_precision = get_lgd_display_precision(b_val);
  }

  const legend_root = map.insert('g')
    .attrs({ id: 'legend_root_lines_class', class: tmp_class_name, transform: 'translate(0,0)', rounding_precision, layer_field: field, layer_name: layer })
    .styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' });

  const rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle')
    .text(title || '').style('font', 'bold 12px "Enriqueta", arial, serif')
    .attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle')
    .text(subtitle).style('font', 'italic 12px "Enriqueta", arial, serif')
    .attrs({ x: xpos + space_elem, y: ypos + 15 });

  const ref_symbols_params = [];

  // Prepare symbols for the legend, taking care of not representing values
  // under the display threshold defined by the user (if any) :
  let current_min_value = +current_layers[layer].min_display;
  if (current_layers[layer].renderer === 'DiscLayer') {
  // Todo use the same way to store the threshold for links and disclayer
  // in order to avoid theses condition
    const values = Array.prototype.map.call(
      svg_map.querySelector(`#${_app.layer_to_id.get(layer)}`).querySelectorAll('path'),
      d => +d.__data__.properties.disc_value);
    current_min_value = current_min_value !== 1
      ? values[Math.round(current_min_value * current_layers[layer].n_features)]
      : values[values.length - 1];
  }
  // for (const b_val of breaks) {
  for (let ix = 0; ix < nb_class; ix++) {
    const b_val = breaks[ix];
    if (b_val[1] !== 0) {
      if (current_min_value >= +b_val[0][0] && current_min_value < +b_val[0][1]) {
        ref_symbols_params.push({ value: [current_min_value, b_val[0][1]], size: b_val[1] });
      } else if (current_min_value < +b_val[0][0] && current_min_value < +b_val[0][1]) {
        ref_symbols_params.push({ value: b_val[0], size: b_val[1] });
      }
    }
  }

  ref_symbols_params.reverse();

  const legend_elems = legend_root.selectAll('.legend')
    .append('g')
    .data(ref_symbols_params)
    .enter()
    .insert('g')
    .attr('class', (d, i) => `lg legend_${i}`);

  const max_size = current_layers[layer].size[1],
    color = current_layers[layer].fill_color.single,
    xrect = xpos + space_elem + max_size / 2;
  let last_size = 0,
    last_pos = y_pos2;

  legend_elems
    .append('rect')
    .styles({ fill: color, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1, 'stroke-width': 0 })
    .attrs((d) => {
      last_pos = boxgap + last_pos + last_size;
      last_size = d.size * svg_map.__zoom.k;
      return { x: xrect, y: last_pos, width: 45, height: last_size };
    });

  last_pos = y_pos2;
  last_size = 0;

  const x_text_pos = xpos + space_elem + max_size * 1.5 + 45;
  let tmp_pos;
  legend_elems.append('text')
    .attrs((d) => {
      last_pos = boxgap + last_pos + last_size;
      last_size = d.size * svg_map.__zoom.k;
      tmp_pos = last_pos - (last_size / 4);
      return { x: x_text_pos, y: tmp_pos };
    })
    .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
    .text(d => round_value(d.value[1], rounding_precision).toLocaleString());

  legend_root.insert('text').attr('id', 'lgd_choro_min_val')
    .attr('x', x_text_pos)
    .attr('y', tmp_pos + boxgap)
    .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
    .text(round_value(ref_symbols_params[ref_symbols_params.length - 1].value[0], rounding_precision).toLocaleString());

  legend_root.call(drag_legend_func(legend_root));

  legend_root.append('g')
    .insert('text').attr('id', 'legend_bottom_note')
    .attrs({ x: xpos + space_elem, y: last_pos + 2 * space_elem })
    .style('font', '11px "Enriqueta", arial, serif')
    .text(note_bottom != null ? note_bottom : '');
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  // legend_root.select('#legendtitle').text(title || "");
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

/**
* Function computing the size of the rectangle to be put under the legend
* (called on each change modifying the size of the legend box,
* eg. longer title, switching to nested symbols, etc..)
*
*/
function make_underlying_rect(legend_root, under_rect, fill) {
  under_rect.attrs({ width: 0, height: 0 });
  const bboxLegend = legend_root.node().getBoundingClientRect();
  let translate = legend_root.attr('transform');
  const { x: x0, y: y0 } = get_map_xy0();

  translate = translate
          ? translate.split('translate(')[1].split(')')[0].split(',').map(d => +d)
          : [0, 0];

  const x_top_left = bboxLegend.left - x0 - 12.5 - translate[0];
  const y_top_left = bboxLegend.top - y0 - 12.5 - translate[1];
  const x_top_right = bboxLegend.right - x0 + 12.5 - translate[0];
  const y_bottom_left = bboxLegend.bottom - y0 + 12.5 - translate[1];
  const rect_height = y_bottom_left - y_top_left;
  const rect_width = x_top_right - x_top_left;

  under_rect.attrs({
    id: 'under_rect',
    x: x_top_left,
    y: y_top_left,
    height: rect_height,
    width: rect_width });

  if (!fill || (!fill.color || !fill.opacity)) {
    under_rect.styles({ fill: 'green', 'fill-opacity': 0 });
    legend_root.attr('visible_rect', 'false');
    legend_root.on('mouseover', () => { under_rect.style('fill-opacity', 0.1); })
               .on('mouseout', () => { under_rect.style('fill-opacity', 0); });
  } else {
    under_rect.styles({ fill: fill.color, 'fill-opacity': fill.opacity });
    legend_root.attr('visible_rect', 'true');
    legend_root.on('mouseover', null).on('mouseout', null);
  }
}

function createLegend_symbol(layer, field, title, subtitle, nested = 'false', rect_fill_value, rounding_precision, note_bottom, options = {}) {
  const parent = options.parent || window.map;
  const space_elem = 18;
  const boxgap = 4;
  const xpos = 30;
  const ypos = 30;
  let y_pos2 = ypos + space_elem * 1.5;
  const nb_features = current_layers[layer].n_features;
  const tmp_class_name = ['legend', 'legend_feature', `lgdf_${_app.layer_to_id.get(layer)}`].join(' ');
  const symbol_type = current_layers[layer].symbol;

  const color_symb_lgd = (
    current_layers[layer].renderer === 'PropSymbolsChoro'
      || current_layers[layer].renderer === 'PropSymbolsTypo'
      || current_layers[layer].fill_color.two !== undefined
      || current_layers[layer].fill_color.random !== undefined)
    ? '#FFF' : current_layers[layer].fill_color.single;

  const legend_root = parent.insert('g')
    .styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' })
    .attrs({ id: 'legend_root_symbol',
      class: tmp_class_name,
      transform: 'translate(0,0)',
      layer_name: layer,
      nested,
      rounding_precision,
      layer_field: field });

  const rect_under_legend = legend_root.insert('rect');
  legend_root.insert('text').attr('id', 'legendtitle')
    .text(title)
    .style('font', 'bold 12px "Enriqueta", arial, serif')
    .attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });
  legend_root.insert('text').attr('id', 'legendsubtitle')
    .text(subtitle)
    .style('font', 'italic 12px "Enriqueta", arial, serif')
    .attrs({ x: xpos + space_elem, y: ypos + 15 });

  const ref_symbols = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName(symbol_type);
  const type_param = symbol_type === 'circle' ? 'r' : 'width';
  const z_scale = +d3.zoomTransform(map.node()).k;
  const [ref_value, ref_size] = current_layers[layer].size;
  const propSize = new PropSizer(ref_value, ref_size, symbol_type);

  if (!current_layers[layer].size_legend_symbol) {
    let non_empty = Array.prototype.filter.call(ref_symbols, (d, i) => { if (d[type_param].baseVal.value != 0) return d[type_param].baseVal.value; }),
      size_max = +non_empty[0].getAttribute(type_param),
      size_min = +non_empty[non_empty.length - 1].getAttribute(type_param),
      sqrt = Math.sqrt,
      val_max = Math.abs(+non_empty[0].__data__.properties[field]),
      val_min = Math.abs(+non_empty[non_empty.length - 1].__data__.properties[field]),
      r = Math.max(get_nb_decimals(val_max), get_nb_decimals(val_min)),
      diff_size = sqrt(size_max) - sqrt(size_min),
      size_interm1 = sqrt(size_min) + diff_size / 3,
      size_interm2 = Math.pow(size_interm1 + diff_size / 3, 2);
    size_interm1 = Math.pow(size_interm1, 2);
    current_layers[layer].size_legend_symbol = [
      { value: val_max },
      { value: round_value(propSize.get_value(size_interm2), r) },
      { value: round_value(propSize.get_value(size_interm1), r) },
      { value: val_min },
    ];
  }

  const t = current_layers[layer].size_legend_symbol;
  const ref_symbols_params = [
    { size: propSize.scale(t[0].value) * z_scale, value: t[0].value },
    { size: propSize.scale(t[1].value) * z_scale, value: t[1].value },
    { size: propSize.scale(t[2].value) * z_scale, value: t[2].value },
    { size: propSize.scale(t[3].value) * z_scale, value: t[3].value },
  ];
  if (ref_symbols_params[3].value === 0) {
    ref_symbols_params.pop();
  }
  if (ref_symbols_params[2].value === 0) {
    ref_symbols_params.pop();
  }
  const legend_elems = legend_root.selectAll('.legend')
    .append('g')
    .data(ref_symbols_params)
    .enter()
    .insert('g')
    .attr('class', (d, i) => `lg legend_${i}`);

  const max_size = ref_symbols_params[0].size;
  let last_size = 0;

  if (symbol_type === 'rect') {
    y_pos2 -= max_size / 2;
  }

  let last_pos = y_pos2;

  if (nested === 'false') {
    if (symbol_type === 'circle') {
      legend_elems
        .append('circle')
        .styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 })
        .attrs((d, i) => {
          last_pos = (i * boxgap) + d.size + last_pos + last_size;
          last_size = d.size;
          return {
            cx: xpos + space_elem + boxgap + max_size / 2,
            cy: last_pos,
            r: d.size,
          };
        });

      last_pos = y_pos2; last_size = 0;
      legend_elems.append('text')
        .attrs((d, i) => {
          last_pos = (i * boxgap) + d.size + last_pos + last_size;
          last_size = d.size;
          return {
            x: xpos + space_elem + boxgap + max_size * 1.5 + 5,
            y: last_pos + (i * 2 / 3),
          };
        })
        .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
        .text(d => round_value(d.value, rounding_precision).toLocaleString());
    } else if (symbol_type === 'rect') {
      legend_elems
        .append('rect')
        .styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 })
        .attrs((d, i) => {
          last_pos = (i * boxgap) + (d.size / 2) + last_pos + last_size;
          last_size = d.size;
          return {
            x: xpos + space_elem + boxgap + max_size / 2 - last_size / 2,
            y: last_pos,
            width: last_size,
            height: last_size,
          };
        });

      last_pos = y_pos2; last_size = 0;
      const x_text_pos = xpos + space_elem + max_size * 1.25;
      legend_elems.append('text')
        .attr('x', x_text_pos)
        .attr('y', (d, i) => {
          last_pos = (i * boxgap) + (d.size / 2) + last_pos + last_size;
          last_size = d.size;
          return last_pos + (d.size * 0.6);
        })
        .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
        .text(d => round_value(d.value, rounding_precision).toLocaleString());
    }
  } else if (nested === 'true') {
    if (symbol_type === 'circle') {
      legend_elems
        .append('circle')
        .attrs(d => ({
          cx: xpos + space_elem + boxgap + max_size / 2,
          cy: ypos + 45 + max_size + (max_size / 2) - d.size,
          r: d.size,
        }))
        .styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 });
      last_pos = y_pos2; last_size = 0;
      legend_elems.append('text')
        .attr('x', xpos + space_elem + boxgap + max_size * 1.5 + 5)
        .attr('y', d => ypos + 45 + max_size * 2 - (max_size / 2) - d.size * 2)
        .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
        .text(d => round_value(d.value, rounding_precision).toLocaleString());
      last_pos = ypos + 30 + max_size + (max_size / 2);
    } else if (symbol_type === 'rect') {
      legend_elems
        .append('rect')
        .attrs(d => ({
          x: xpos + space_elem + boxgap,
          y: ypos + 45 + max_size - d.size,
          width: d.size,
          height: d.size }))
        .styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 });
      last_pos = y_pos2; last_size = 0;
      legend_elems.append('text')
        .attr('x', xpos + space_elem + max_size * 1.25)
        .attr('y', d => ypos + 46 + max_size - d.size)
        .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
        .text(d => round_value(d.value, rounding_precision).toLocaleString());
      last_pos = ypos + 30 + max_size;
    }
  }

  if (current_layers[layer].break_val !== undefined) {
    const bottom_colors = legend_root.append('g');
    bottom_colors.insert('text').attr('id', 'col1_txt')
      .attr('x', xpos + space_elem)
      .attr('y', last_pos + 1.75 * space_elem)
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .html(`< ${current_layers[layer].break_val.toLocaleString()}`);
    bottom_colors
      .insert('rect').attr('id', 'col1')
      .attr('x', xpos + space_elem)
      .attr('y', last_pos + 2 * space_elem)
      .attrs({ width: space_elem, height: space_elem })
      .style('fill', current_layers[layer].fill_color.two[0]);
    bottom_colors.insert('text').attr('id', 'col1_txt')
      .attr('x', xpos + 3 * space_elem)
      .attr('y', last_pos + 1.75 * space_elem)
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .html(`> ${current_layers[layer].break_val.toLocaleString()}`);
    bottom_colors
      .insert('rect').attr('id', 'col2')
      .attr('x', xpos + 3 * space_elem)
      .attr('y', last_pos + 2 * space_elem)
      .attrs({ width: space_elem, height: space_elem })
      .style('fill', current_layers[layer].fill_color.two[1]);
    last_pos += 2.5 * space_elem;
  }

  legend_root.append('g')
    .insert('text').attr('id', 'legend_bottom_note')
    .attrs({ x: xpos + space_elem, y: last_pos + 2 * space_elem })
    .style('font', '11px "Enriqueta", arial, serif')
    .text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  if (parent == map) make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function createLegend_line_symbol(layer, field, title, subtitle, rect_fill_value, rounding_precision, note_bottom) {
  const space_elem = 18,
    boxgap = 12,
    xpos = 30,
    ypos = 30,
    y_pos2 = ypos + space_elem,
    tmp_class_name = ['legend', 'legend_feature', `lgdf_${_app.layer_to_id.get(layer)}`].join(' ');

  const ref_symbols = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path');
  const type_param = 'strokeWidth';

  const non_empty = Array.prototype.filter.call(ref_symbols, d => d.style[type_param] !== '0'),
    size_max = +non_empty[0].style[type_param],
    size_min = +non_empty[non_empty.length - 1].style[type_param],
    val_max = Math.abs(+non_empty[0].__data__.properties[field]),
    val_min = Math.abs(+non_empty[non_empty.length - 1].__data__.properties[field]),
    diff_size = size_max - size_min,
    diff_val = val_max - val_min,
    val_interm1 = val_min + diff_val / 3,
    val_interm2 = val_interm1 + diff_val / 3,
    size_interm1 = size_min + diff_size / 3,
    size_interm2 = size_interm1 + diff_size / 3,
    ref_symbols_params = [
        { size: size_max, value: val_max },
        { size: size_interm2, value: val_interm2 },
        { size: size_interm1, value: val_interm1 },
        { size: size_min, value: val_min },
    ];

  if (rounding_precision === undefined) {
    rounding_precision = get_lgd_display_precision(ref_symbols_params.map(d => d.value));
  }

  const legend_root = map.insert('g')
      .attrs({ id: 'legend_root_lines_symbol',
        class: tmp_class_name,
        transform: 'translate(0,0)',
        rounding_precision,
        layer_field: field,
        layer_name: layer })
      .styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' });

  const rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle')
    .text(title || 'Title').style('font', 'bold 12px "Enriqueta", arial, serif')
    .attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle')
    .text(subtitle).style('font', 'italic 12px \'Enriqueta\', arial, serif')
    .attrs({ x: xpos + space_elem, y: ypos + 15 });

  const legend_elems = legend_root.selectAll('.legend')
    .append('g')
    .data(ref_symbols_params)
    .enter()
    .insert('g')
    .attr('class', (d, i) => `lg legend_${i}`);

  let last_size = 0;
  let last_pos = y_pos2;
  const color = current_layers[layer].fill_color.single;
  const xrect = xpos + space_elem;

  legend_elems
    .append('rect')
    .styles({ fill: color, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1, 'stroke-width': 0 })
    .attrs((d) => {
      last_pos = boxgap + last_pos + last_size;
      last_size = d.size;
      return { x: xrect, y: last_pos, width: 45, height: d.size };
    });

  last_pos = y_pos2; last_size = 0;
  const x_text_pos = xrect + 55;
  legend_elems.append('text')
    .attrs((d) => {
      last_pos = boxgap + last_pos + d.size;
      return { x: x_text_pos, y: last_pos + 4 - d.size / 2 };
    })
    .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
    .text(d => round_value(d.value, rounding_precision).toLocaleString());

  legend_root.append('g')
    .insert('text').attr('id', 'legend_bottom_note')
    .attrs({ x: xpos + space_elem, y: last_pos + space_elem })
    .style('font', "11px 'Enriqueta', arial, serif")
    .text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  legend_root.select('#legendtitle').text(title || '');
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}


const get_lgd_display_precision = function (breaks) {
  // Set rounding precision to 0 if they are all integers :
  if (breaks.filter(b => (b | 0) === b).length === breaks.length) {
    return 0;
  }
  // Compute the difference between each break to set
  // ... the rounding precision in order to differenciate each class :
  let diff;
  for (let i = 0; i < (breaks.length - 1); i++) {
    const d = +breaks[i + 1] - +breaks[i];
    if (!diff) diff = d;
    else if (d < diff) diff = d;
  }
  if (diff > 1 || diff > 0.1) {
    return 1;
  } else if (diff > 0.01) {
    return 2;
  } else if (diff > 0.001) {
    return 3;
  } else if (diff > 0.0001) {
    return 4;
  } else if (diff > 0.00001) {
    return 5;
  } else if (diff > 0.000001) {
    return 6;
  } else if (diff > 0.0000001) {
    return 7;
  }
  return undefined;
};

function createLegend_choro(layer, field, title, subtitle, box_gap = 0, rect_fill_value, rounding_precision, no_data_txt, note_bottom) {
  const boxheight = 18,
    boxwidth = 18,
    xpos = 30,
    ypos = 30,
    y_pos2 = ypos + boxheight * 1.8,
    tmp_class_name = ['legend', 'legend_feature', `lgdf_${_app.layer_to_id.get(layer)}`].join(' ');

  const boxgap = +box_gap;

  let last_pos = null,
    nb_class,
    data_colors_label;

  if (current_layers[layer].renderer.indexOf('Categorical') > -1 || current_layers[layer].renderer.indexOf('PropSymbolsTypo') > -1) {
    data_colors_label = [];
    current_layers[layer].color_map.forEach((v, k) => {
      data_colors_label.push({ value: v[1], color: v[0] });
    });
    nb_class = current_layers[layer].color_map.size;
  } else if (current_layers[layer].renderer.indexOf('TypoSymbols') > -1) {
    data_colors_label = [];
    current_layers[layer].symbols_map.forEach((v, k) => {
      data_colors_label.push({ value: k, image: v });
    });
    nb_class = current_layers[layer].symbols_map.size;
  } else {
    data_colors_label = current_layers[layer].colors_breaks.map(obj => ({ value: obj[0], color: obj[1] }));
    nb_class = current_layers[layer].colors_breaks.length;
    if (rounding_precision === undefined) {
      const breaks = current_layers[layer].options_disc.breaks;
      rounding_precision = get_lgd_display_precision(breaks);
    }
  }

  const legend_root = map.insert('g')
    .styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' })
    .attrs({ id: 'legend_root',
      class: tmp_class_name,
      layer_field: field,
      transform: 'translate(0,0)',
      boxgap,
      rounding_precision,
      layer_name: layer });

  const rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle')
    .text(title || '').style('font', 'bold 12px "Enriqueta", arial, serif')
    .attrs(subtitle != '' ? { x: xpos + boxheight, y: ypos } : { x: xpos + boxheight, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle')
    .text(subtitle).style('font', 'italic 12px "Enriqueta", arial, serif')
    .attrs({ x: xpos + boxheight, y: ypos + 15 });

  const legend_elems = legend_root.selectAll('.legend')
    .append('g')
    .data(data_colors_label)
    .enter()
    .insert('g')
    .attr('class', (d, i) => `lg legend_${i}`);

  if (current_layers[layer].renderer.indexOf('TypoSymbols') === -1) {
    legend_elems
      .append('rect')
      .attr('x', xpos + boxwidth)
      .attr('y', (d, i) => {
        last_pos = y_pos2 + (i * boxgap) + (i * boxheight);
        return last_pos;
      })
      .attrs({ width: boxwidth, height: boxheight })
      .styles(d => ({ fill: d.color, stroke: d.color }));
  } else {
    legend_elems
      .append('image')
      .attrs((d, i) => ({
        x: xpos + boxwidth,
        y: y_pos2 + (i * boxgap) + (i * boxheight),
        width: boxwidth,
        height: boxheight,
        'xlink:href': d.image[0],
      }));
  }

  if (current_layers[layer].renderer.indexOf('Choropleth') > -1
        || current_layers[layer].renderer.indexOf('PropSymbolsChoro') > -1
        || current_layers[layer].renderer.indexOf('Gridded') > -1
        || current_layers[layer].renderer.indexOf('Stewart') > -1) {
    let tmp_pos;
    legend_elems
      .append('text')
      .attr('x', xpos + boxwidth * 2 + 10)
      .attr('y', (d, i) => {
        tmp_pos = y_pos2 + i * boxheight + (i * boxgap);
        return tmp_pos;
      })
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .text(d => round_value(+d.value.split(' - ')[1], rounding_precision).toLocaleString());

    legend_root
      .insert('text').attr('id', 'lgd_choro_min_val')
      .attr('x', xpos + boxwidth * 2 + 10)
      .attr('y', tmp_pos + boxheight + boxgap)
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .text(d => round_value(data_colors_label[data_colors_label.length - 1].value.split(' - ')[0], rounding_precision).toLocaleString());
  } else {
    legend_elems
      .append('text')
      .attr('x', xpos + boxwidth * 2 + 10)
      .attr('y', (d, i) => y_pos2 + i * boxheight + (i * boxgap) + (boxheight * 2 / 3))
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .text(d => d.value);
  }
  if (current_layers[layer].options_disc && current_layers[layer].options_disc.no_data) {
    const gp_no_data = legend_root.append('g');
    gp_no_data
      .append('rect')
      .attrs({ x: xpos + boxheight,
        y: last_pos + 2 * boxheight,
        width: boxwidth,
        height: boxheight })
      .style('fill', current_layers[layer].options_disc.no_data)
      .style('stroke', current_layers[layer].options_disc.no_data);

    gp_no_data
      .append('text')
      .attrs({ x: xpos + boxwidth * 2 + 10, y: last_pos + 2.7 * boxheight, id: 'no_data_txt' })
      .styles({ 'alignment-baseline': 'middle', 'font-size': '10px' })
      .text(no_data_txt != null ? no_data_txt : 'No data');

    last_pos += 2 * boxheight;
  }

  legend_root.append('g')
    .insert('text')
    .attrs({ id: 'legend_bottom_note', x: xpos + boxheight, y: last_pos + 2 * boxheight })
    .style('font', "11px 'Enriqueta', arial, serif")
    .text(note_bottom != null ? note_bottom : '');
  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  // legend_root.select('#legendtitle').text(title || "");
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function display_box_value_symbol(layer_name) {
  const symbol_type = current_layers[layer_name].symbol,
    field = current_layers[layer_name].rendered_field,
    ref_symbols = document.getElementById(_app.layer_to_id.get(layer_name)).getElementsByTagName(symbol_type),
    type_param = symbol_type === 'circle' ? 'r' : 'width',
    non_empty = Array.prototype.filter.call(ref_symbols, (d, i) => { if (d[type_param].baseVal.value != 0) return d[type_param].baseVal.value; }),
    val_max = Math.abs(+non_empty[0].__data__.properties[field]);

  const redraw_sample_legend = (() => {
    const legend_node = svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
    const rendered_field = current_layers[layer_name].rendered_field;
    const nested = legend_node.getAttribute('nested');
    const rounding_precision = legend_node.getAttribute('rounding_precision');
    const lgd_title = legend_node.querySelector('#legendtitle').innerHTML,
      lgd_subtitle = legend_node.querySelector('#legendsubtitle').innerHTML,
      note = legend_node.querySelector('#legend_bottom_note').innerHTML;
    return (values) => {
      if (values) {
        current_layers[layer_name].size_legend_symbol = values.sort((a, b) => b.value - a.value);
        val1.node().value = values[0].value;
        val2.node().value = values[1].value;
        val3.node().value = values[2].value;
        val4.node().value = values[3].value;
      }
      sample_svg.selectAll('g').remove();
      createLegend_symbol(layer_name, rendered_field, lgd_title, lgd_subtitle, nested, {}, rounding_precision, note, { parent: sample_svg });
      sample_svg.select('g').select('#under_rect').remove();
      sample_svg.select('#legend_root_symbol').on('.drag', null);
    };
  })();

  const prom = make_confirm_dialog2('legend_symbol_values_box', `${layer_name} - ${i18next.t('app_page.legend_symbol_values_box.title')}`)
    .then((confirmed) => {
      current_layers[layer_name].size_legend_symbol = confirmed ? current_layers[layer_name].size_legend_symbol : original_values;
      return Promise.resolve(confirmed);
    });

  const box_body = d3.select('.legend_symbol_values_box')
    .select('.modal-content').style('width', '400px')
    .select('.modal-body');
  box_body.append('p').style('text-align', 'center')
    .insert('h3');
    // .html(i18next.t("app_page.legend_symbol_values_box.subtitle"));
  let sample_svg = box_body.append('div').attr('id', 'sample_svg').style('float', 'left')
    .append('svg')
    .attrs({ width: 200, height: 300, id: 'svg_sample_legend' });

  const values_to_use = [].concat(current_layers[layer_name].size_legend_symbol.map(f => cloneObj(f)));
  const [ref_value, ref_size] = current_layers[layer_name].size;
  const propSize = new PropSizer(ref_value, ref_size, symbol_type);
  const input_zone = box_body.append('div')
    .styles({ float: 'right', top: '100px', right: '20px', position: 'relative' });
  const a = input_zone.append('p');
  const b = input_zone.append('p');
  const c = input_zone.append('p');
  const d = input_zone.append('p');
  let original_values = [].concat(values_to_use);
  let val1 = a.insert('input')
    .style('width', '80px')
    .attrs({ class: 'without_spinner', type: 'number', max: val_max })
    .on('change', function () {
      const val = +this.value;
      if (isNaN(val)) return;
      values_to_use[0] = { size: propSize.scale(val), value: val };
      val2.attr('max', val);
      redraw_sample_legend(values_to_use);
    });
  let val2 = b.insert('input')
    .style('width', '80px')
    .attrs({ class: 'without_spinner', type: 'number', max: values_to_use[0].value, min: values_to_use[2] })
    .on('change', function () {
      const val = +this.value;
      if (isNaN(val)) return;
      values_to_use[1] = { size: propSize.scale(val), value: val };
      val1.attr('min', val);
      val3.attr('max', val);
      redraw_sample_legend(values_to_use);
    });
  let val3 = c.insert('input')
    .style('width', '80px')
    .attrs({ class: 'without_spinner', type: 'number', max: values_to_use[1].value, min: values_to_use[3].value })
    .on('change', function () {
      const val = +this.value;
      if (isNaN(val)) return;
      values_to_use[2] = { size: propSize.scale(val), value: val };
      val2.attr('min', val);
      val4.attr('max', val);
      redraw_sample_legend(values_to_use);
    });
  let val4 = d.insert('input')
    .style('width', '80px')
    .attrs({ class: 'without_spinner', type: 'number', min: 0, max: values_to_use[2].value })
    .on('change', function () {
      const val = +this.value;
      if (isNaN(val)) return;
      values_to_use[3] = { size: propSize.scale(val), value: val };
      val3.attr('min', val);
      redraw_sample_legend(values_to_use);
    });
  box_body.append('div')
    .styles({ clear: 'both', 'text-align': 'center' })
    .append('p')
    .styles({ 'text-align': 'center' })
    .insert('span')
    .attrs({ class: 'button_st3' })
    .html(i18next.t('app_page.legend_symbol_values_box.reset'))
    .on('click', () => {
      current_layers[layer_name].size_legend_symbol = undefined;
      redraw_sample_legend(original_values);
    });
  val1.node().value = values_to_use[0].value;
  val2.node().value = values_to_use[1].value;
  val3.node().value = values_to_use[2].value;
  val4.node().value = values_to_use[3].value;
  redraw_sample_legend();
  return prom;
}

// Todo : find a better organization for the options in this box
//       (+ better alignement)
function createlegendEditBox(legend_id, layer_name) {
  function bind_selections() {
    box_class = [layer_id, '_legend_popup'].join('');
    legend_node = svg_map.querySelector(['#', legend_id, '.lgdf_', layer_id].join(''));
    title_content = legend_node.querySelector('#legendtitle');
    subtitle_content = legend_node.querySelector('#legendsubtitle');
    note_content = legend_node.querySelector('#legend_bottom_note');
    no_data_txt = legend_node.querySelector('#no_data_txt');
    ratio_waffle_txt = legend_node.querySelector('#ratio_txt');
    legend_node_d3 = d3.select(legend_node);
    legend_boxes = legend_node_d3.selectAll(['#', legend_id, ' .lg'].join('')).select('text');
  }
  const layer_id = _app.layer_to_id.get(layer_name);
  let box_class,
    legend_node,
    title_content,
    subtitle_content,
    note_content,
    source_content;
  let legend_node_d3,
    legend_boxes,
    no_data_txt,
    ratio_waffle_txt,
    rect_fill_value = {},
    original_rect_fill_value;

  bind_selections();
  if (document.querySelector(`.${box_class}`)) document.querySelector(`.${box_class}`).remove();
  const original_params = {
    title_content: title_content.textContent,
    y_title: title_content.y.baseVal[0].value,
    subtitle_content: subtitle_content.textContent,
    y_subtitle: subtitle_content.y.baseVal[0].value,
    note_content: note_content.textContent,
    no_data_txt: no_data_txt != null ? no_data_txt.textContent : null,
    ratio_waffle_txt: ratio_waffle_txt != null ? ratio_waffle_txt.textContent : null,
  }; // , source_content: source_content.textContent ? source_content.textContent : ""

  if (legend_node.getAttribute('visible_rect') === 'true') {
    rect_fill_value = {
      color: legend_node.querySelector('#under_rect').style.fill,
      opacity: legend_node.querySelector('#under_rect').style.fillOpacity,
    };
    original_rect_fill_value = cloneObj(rect_fill_value);
  }

  make_confirm_dialog2(box_class, layer_name)
    .then((confirmed) => {
      if (!confirmed) {
        title_content.textContent = original_params.title_content;
        title_content.y.baseVal[0].value = original_params.y_title;
        subtitle_content.textContent = original_params.subtitle_content;
        subtitle_content.y.baseVal[0].value = original_params.y_subtitle;
        note_content.textContent = original_params.note_content;
        if (no_data_txt) {
          no_data_txt.textContent = original_params.no_data_txt;
        } else if (ratio_waffle_txt) {
          ratio_waffle_txt.textContent = original_params.ratio_waffle_txt;
        }
        rect_fill_value = original_rect_fill_value;
      }
      make_underlying_rect(legend_node_d3,
                           legend_node_d3.select('#under_rect'),
                           rect_fill_value);
      bind_selections();
    });
  const container = document.querySelectorAll(`.${box_class}`)[0];
  const box_body = d3.select(container)
    .select('.modal-dialog').style('width', '375px')
    .select('.modal-body');
  let current_nb_dec;

  box_body.append('p').style('text-align', 'center')
    .insert('h3').html(i18next.t('app_page.legend_style_box.subtitle'));

  const a = box_body.append('p');
  a.append('span')
    .html(i18next.t('app_page.legend_style_box.lgd_title'));

  a.append('input')
    .styles({ float: 'right' })
    .attr('value', title_content.textContent)
    .on('keyup', function () {
      title_content.textContent = this.value;
    });

  const b = box_body.append('p');
  b.insert('span')
    .html(i18next.t('app_page.legend_style_box.var_name'));
  b.insert('input')
    .attr('value', subtitle_content.textContent)
    .styles({ float: 'right' })
    .on('keyup', function () {
      const empty = subtitle_content.textContent == '';
      // Move up the title to its original position if the subtitle isn't empty :
      if (empty && this.value != '') {
        title_content.y.baseVal[0].value = title_content.y.baseVal[0].value - 15;
      }
      // Change the displayed content :
      subtitle_content.textContent = this.value;
      // Move down the title (if it wasn't already moved down), if the new subtitle is empty
      if (!empty && subtitle_content.textContent == '') {
        title_content.y.baseVal[0].value = title_content.y.baseVal[0].value + 15;
      }
    });

  const c = box_body.insert('p');
  c.insert('span')
    .html(i18next.t('app_page.legend_style_box.additionnal_notes'));
  c.insert('input')
    .attr('value', note_content.textContent)
    .styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' })
    .on('keyup', function () {
      note_content.textContent = this.value;
    });

  if (no_data_txt) {
    const d = box_body.insert('p');
    d.insert('span')
      .html(i18next.t('app_page.legend_style_box.no_data'));
    d.insert('input')
      .attr('value', no_data_txt.textContent)
      .styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' })
      .on('keyup', function () {
        no_data_txt.textContent = this.value;
      });
  } else if (ratio_waffle_txt) {
    const d = box_body.insert('p');
    d.insert('span')
      .html(i18next.t('app_page.legend_style_box.ratio_waffle_txt'));
    d.insert('input')
      .attr('value', ratio_waffle_txt.textContent)
      .styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' })
      .on('keyup', function () {
        ratio_waffle_txt.textContent = this.value;
      });
  }

  if (legend_id === 'legend_root_symbol') {
    const choice_break_value_section1 = box_body.insert('p')
      .styles({ 'text-align': 'center', 'margin-top': '25px !important' });
    choice_break_value_section1.append('span')
      .attr('class', 'button_disc')
      .styles({ cursor: 'pointer' })
      .html(i18next.t('app_page.legend_style_box.choice_break_symbol'))
      .on('click', () => {
        container.modal.hide();
        display_box_value_symbol(layer_name).then((confirmed) => {
          container.modal.show();
          if (confirmed) {
            redraw_legends_symbols(svg_map.querySelector(
              ['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join('')));
          }
        });
      });
  } else if ((current_layers[layer_name].renderer !== 'TwoStocksWaffle' && current_layers[layer_name].renderer !== 'Categorical' && current_layers[layer_name].renderer !== 'TypoSymbols')
      && !(current_layers[layer_name].renderer === 'PropSymbolsTypo' && legend_id.indexOf('2'))) {
    // Float precision for label in the legend
    // (actually it's not really the float precision but an estimation based on
    // the string representation of only two values but it will most likely do the job in many cases)
    let max_nb_decimals = 0;
    let max_nb_left = 0;
    if (legend_id.indexOf('2') === -1 && legend_id.indexOf('links') === -1) {
      max_nb_decimals = get_max_nb_dec(layer_name);
      max_nb_left = get_max_nb_left_sep(layer_name);
    } else {
      const nb_dec = [],
        nb_left = [];
      legend_boxes.each((d) => {
        nb_dec.push(get_nb_decimals(d.value));
        nb_left.push(get_nb_left_separator(d.value));
      });
      max_nb_decimals = max_fast(nb_dec);
      max_nb_left = min_fast(nb_left);
    }
    max_nb_left = max_nb_left > 2 ? max_nb_left : 2;
    if (max_nb_decimals > 0 || max_nb_left >= 2) {
      if (legend_node.getAttribute('rounding_precision')) {
        current_nb_dec = legend_node.getAttribute('rounding_precision');
      } else {
        const nbs = [],
          nb_dec = [];
        legend_boxes.each(function () { nbs.push(this.textContent); });
        for (let i = 0; i < nbs.length; i++) {
          nb_dec.push(get_nb_decimals(nbs[i]));
        }
        current_nb_dec = max_fast(nb_dec);
      }
      if (max_nb_decimals > +current_nb_dec && max_nb_decimals > 18) { max_nb_decimals = 18; }
      const e = box_body.append('p');
      e.append('span')
        .html(i18next.t('app_page.legend_style_box.float_rounding'));

      e.append('input')
        .attrs({ id: 'precision_range', type: 'range', min: -(+max_nb_left), max: max_nb_decimals, step: 1, value: current_nb_dec })
        .styles({ float: 'right', width: '90px', 'vertical-align': 'middle', 'margin-left': '10px' })
        .on('change', function () {
          const nb_float = +this.value;
          d3.select('#precision_change_txt').html(nb_float);
          legend_node.setAttribute('rounding_precision', nb_float);
          if (legend_id === 'legend_root') {
            for (let i = 0; i < legend_boxes._groups[0].length; i++) {
              const values = legend_boxes._groups[0][i].__data__.value.split(' - ');
              legend_boxes._groups[0][i].innerHTML = round_value(+values[1], nb_float).toLocaleString();
            }
            const min_val = +legend_boxes._groups[0][legend_boxes._groups[0].length - 1].__data__.value.split(' - ')[0];
            legend_node.querySelector('#lgd_choro_min_val').innerHTML = round_value(min_val, nb_float).toLocaleString();
          } else if (legend_id === 'legend_root_symbol') {
            for (let i = 0; i < legend_boxes._groups[0].length; i++) {
              const value = legend_boxes._groups[0][i].__data__.value;
              legend_boxes._groups[0][i].innerHTML = round_value(+value, nb_float).toLocaleString();
            }
          } else if (legend_id === 'legend_root_lines_class') {
            for (let i = 0; i < legend_boxes._groups[0].length; i++) {
              const value = legend_boxes._groups[0][i].__data__.value[1];
              legend_boxes._groups[0][i].innerHTML = round_value(+value, nb_float).toLocaleString();
            }
            const min_val = +legend_boxes._groups[0][legend_boxes._groups[0].length - 1].__data__.value[0];
            legend_node.querySelector('#lgd_choro_min_val').innerHTML = round_value(min_val, nb_float).toLocaleString();
          }
        });
      e.append('span')
        .styles({ float: 'right' })
        .attr('id', 'precision_change_txt')
        .html(`${current_nb_dec}`);
    }
  }

  if (legend_id === 'legend_root') {
    const current_state = +legend_node.getAttribute('boxgap') === 0;
    const gap_section = box_body.insert('p');
    gap_section.append('input')
      .style('margin-left', '0px')
      .attrs({ type: 'checkbox', id: 'style_lgd' })
      .on('change', () => {
        const rendered_field = current_layers[layer_name].rendered_field2 ? current_layers[layer_name].rendered_field2 : current_layers[layer_name].rendered_field;
        legend_node = svg_map.querySelector(['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
        const boxgap = +legend_node.getAttribute('boxgap') == 0 ? 4 : 0;
        const rounding_precision = legend_node.getAttribute('rounding_precision');
        const transform_param = legend_node.getAttribute('transform'),
          lgd_title = legend_node.querySelector('#legendtitle').innerHTML,
          lgd_subtitle = legend_node.querySelector('#legendsubtitle').innerHTML,
          note = legend_node.querySelector('#legend_bottom_note').innerHTML;
        let _no_data_txt = legend_node.querySelector('#no_data_txt');
        _no_data_txt = _no_data_txt != null ? _no_data_txt.textContent : null;
        legend_node.remove();
        createLegend_choro(layer_name, rendered_field, lgd_title, lgd_subtitle, boxgap, rect_fill_value, rounding_precision, _no_data_txt, note);
        bind_selections();
        if (transform_param) {
          svg_map.querySelector(['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join('')).setAttribute('transform', transform_param);
        }
      });
    gap_section.append('label')
        .attrs({ for: 'style_lgd', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.gap_boxes' })
        .html(i18next.t('app_page.legend_style_box.gap_boxes'));

    document.getElementById('style_lgd').checked = current_state;
  } else if (legend_id === 'legend_root_symbol') {
    const current_state = legend_node.getAttribute('nested') === 'true';
    const gap_section = box_body.insert('p');
    gap_section.append('input')
      .style('margin-left', '0px')
      .attrs({ id: 'style_lgd', type: 'checkbox' })
      .on('change', () => {
        legend_node = svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
        const rendered_field = current_layers[layer_name].rendered_field;
        const nested = legend_node.getAttribute('nested') === 'true' ? 'false' : 'true';
        const rounding_precision = legend_node.getAttribute('rounding_precision');
        const transform_param = legend_node.getAttribute('transform'),
          lgd_title = legend_node.querySelector('#legendtitle').innerHTML,
          lgd_subtitle = legend_node.querySelector('#legendsubtitle').innerHTML,
          note = legend_node.querySelector('#legend_bottom_note').innerHTML;

        legend_node.remove();
        createLegend_symbol(layer_name, rendered_field, lgd_title, lgd_subtitle, nested, rect_fill_value, rounding_precision, note);
        bind_selections();
        if (transform_param) {
          svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join('')).setAttribute('transform', transform_param);
        }
      });
    gap_section.append('label')
      .attrs({ for: 'style_lgd', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.nested_symbols' })
      .html(i18next.t('app_page.legend_style_box.nested_symbols'));
    document.getElementById('style_lgd').checked = current_state;
  }
// Todo : Reactivate this functionnality :
//    box_body.insert("p").html("Display features count ")
//            .insert("input").attr("type", "checkbox")
//            .on("change", function(){
//                alert("to be done!");
//            });

  const rectangle_options1 = box_body.insert('p');
  rectangle_options1.insert('input')
    .style('margin-left', '0px')
    .attrs({ type: 'checkbox',
      id: 'rect_lgd_checkbox',
      checked: rect_fill_value.color === undefined ? null : true })
    .on('change', function () {
      if (this.checked) {
        rectangle_options2.style('display', '');
        const r = document.getElementById('choice_color_under_rect');
        rect_fill_value = r ? { color: r.value, opacity: 1 } : { color: '#ffffff', opacity: 1 };
      } else {
        rectangle_options2.style('display', 'none');
        rect_fill_value = {};
      }
      make_underlying_rect(legend_node_d3,
                           legend_node_d3.select('#under_rect'),
                           rect_fill_value);
    });
  rectangle_options1.append('label')
    .attrs({ for: 'rect_lgd_checkbox', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.under_rectangle' })
    .html(i18next.t('app_page.legend_style_box.under_rectangle'));

  let rectangle_options2 = rectangle_options1.insert('span')
    .styles({ float: 'right', display: rect_fill_value.color === undefined ? 'none' : '' });
  rectangle_options2.insert('input')
    .attrs({ id: 'choice_color_under_rect',
      type: 'color',
      value: rect_fill_value.color === undefined ? '#ffffff' : rgb2hex(rect_fill_value.color) })
    .on('change', function () {
      rect_fill_value = { color: this.value, opacity: 1 };
      make_underlying_rect(legend_node_d3, legend_node_d3.select('#under_rect'), rect_fill_value);
    });
}

function move_legends() {
  const xy0_map = get_map_xy0();
  const dim_width = w + xy0_map.x;
  const dim_heght = h + xy0_map.y;
  const legends = [
    svg_map.querySelectorAll('.legend_feature'),
    svg_map.querySelectorAll('#scale_bar.legend'),
  ];
  for (let j = 0; j < 2; ++j) {
    const legends_type = legends[j];
    for (let i = 0, i_len = legends_type.length; i < i_len; ++i) {
      const legend_bbox = legends_type[i].getBoundingClientRect();
      if ((legend_bbox.left + legend_bbox.width) > dim_width) {
        const current_transform = legends_type[i].getAttribute('transform');
        const [val_x, val_y] = /\(([^\)]+)\)/.exec(current_transform)[1].split(',');
        const trans_x = legend_bbox.left + legend_bbox.width - dim_width;
        legends_type[i].setAttribute('transform',
            ['translate(', [+val_x - trans_x, val_y], ')'].join(''));
      }
      if ((legend_bbox.top + legend_bbox.height) > dim_heght) {
        const current_transform = legends_type[i].getAttribute('transform');
        const [val_x, val_y] = /\(([^\)]+)\)/.exec(current_transform)[1].split(',');
        const trans_y = legend_bbox.top + legend_bbox.height - dim_heght;
        legends_type[i].setAttribute('transform',
            ['translate(', [val_x, +val_y - trans_y], ')'].join(''));
      }
    }
  }
}

const get_max_nb_dec = function (layer_name) {
  if (!(current_layers[layer_name]) || !(current_layers[layer_name].colors_breaks)) { return; }
  let max = 0;
  current_layers[layer_name].colors_breaks.forEach((el) => {
    const tmp = el[0].split(' - ');
    const p1 = tmp[0].indexOf('.');
    const p2 = tmp[1].indexOf('.');
    if (p1 > -1) {
      if (tmp[0].length - 1 - p1 > max) { max = tmp[0].length - 1 - tmp[0].indexOf('.'); }
    }
    if (p2 > -1) {
      if (tmp[1].length - 1 - p2 > max) { max = tmp[1].length - 1 - tmp[1].indexOf('.'); }
    }
  });
  return max;
};

function _get_max_nb_left_sep(values) {
  return max_fast(values.map(d => (`${d}`).split('.')[0].length));
}

const get_max_nb_left_sep = function (layer_name) {
  if (!(current_layers[layer_name]) || !(current_layers[layer_name].colors_breaks)) { return; }
  const nb_left = [];
  current_layers[layer_name].colors_breaks.forEach((el) => {
    const tmp = el[0].split(' - ');
    const p1 = tmp[0].indexOf('.'),
      p2 = tmp[1].indexOf('.');
    nb_left.push(p1);
    nb_left.push(p2);
  });
  return min_fast(nb_left);
};
