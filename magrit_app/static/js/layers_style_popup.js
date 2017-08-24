'use strict';

/**
* Function to dispatch the click on the "open style box" icon
* to the actual appropriate function according to the type of the layer.
*
* @param {String} layer_name - The name of the layer.
* @return {void} - Nothing is returned but the "style box" should open.
*
*/
function handle_click_layer(layer_name) {
  if (current_layers[layer_name].graticule) {
    createStyleBoxGraticule();
  } else if (current_layers[layer_name].type === 'Line') {
    createStyleBox_Line(layer_name);
  } else if (current_layers[layer_name].renderer
      && current_layers[layer_name].renderer.indexOf('PropSymbol') > -1) {
    createStyleBox_ProbSymbol(layer_name);
  } else if (current_layers[layer_name].renderer
      && current_layers[layer_name].renderer === 'Label') {
    createStyleBoxLabel(layer_name);
  } else if (current_layers[layer_name].renderer
      && current_layers[layer_name].renderer === 'TypoSymbols') {
    createStyleBoxTypoSymbols(layer_name);
  } else if (current_layers[layer_name].renderer
      && current_layers[layer_name].renderer === 'TwoStocksWaffle') {
    createStyleBoxWaffle(layer_name);
  } else if (current_layers[layer_name].renderer === 'Stewart') {
    createStyleBoxStewart(layer_name);
  } else {
    createStyleBox(layer_name);
  }
}

function make_single_color_menu(layer, fill_prev, symbol = 'path') {
  const fill_color_section = d3.select('#fill_color_section'),
    g_lyr_name = `#${_app.layer_to_id.get(layer)}`,
    last_color = (fill_prev && fill_prev.single) ? fill_prev.single : '#FFF';
  const block = fill_color_section.insert('p');
  block.insert('span')
    .html(i18next.t('app_page.layer_style_popup.fill_color'));
  block.insert('input')
    .style('float', 'right')
    .attrs({ type: 'color', value: last_color })
    .on('change', function () {
      map.select(g_lyr_name)
        .selectAll(symbol)
        .transition()
        .style('fill', this.value);
      current_layers[layer].fill_color = { single: this.value };
    });
  map.select(g_lyr_name)
    .selectAll(symbol)
    .transition()
    .style('fill', last_color);
  current_layers[layer].fill_color = { single: last_color };
}

function make_random_color(layer, symbol = 'path') {
  const block = d3.select('#fill_color_section');
  block.selectAll('span').remove();
  block.insert('span')
    .styles({ cursor: 'pointer', 'text-align': 'center' })
    .html(i18next.t('app_page.layer_style_popup.toggle_colors'))
    .on('click', (d, i) => {
      map.select(`#${_app.layer_to_id.get(layer)}`)
        .selectAll(symbol)
        .transition()
        .style('fill', () => Colors.names[Colors.random()]);
      current_layers[layer].fill_color = { random: true };
      make_random_color(layer, symbol);
    });
  map.select(`#${_app.layer_to_id.get(layer)}`)
    .selectAll(symbol)
    .transition()
    .style('fill', () => Colors.names[Colors.random()]);
  current_layers[layer].fill_color = { random: true };
}

function fill_categorical(layer, field_name, symbol, color_cat_map) {
  map.select(`#${_app.layer_to_id.get(layer)}`)
    .selectAll(symbol)
    .transition()
    .style('fill', d => color_cat_map.get(d.properties[field_name]));
}

function make_categorical_color_menu(fields, layer, fill_prev, symbol = 'path') {
  const fill_color_section = d3.select('#fill_color_section').append('p');
  fill_color_section.insert('span').html(i18next.t('app_page.layer_style_popup.categorical_field'));
  const field_selec = fill_color_section.insert('select');
  fields.forEach((field) => {
    if (field !== 'id') field_selec.append('option').text(field).attr('value', field);
  });
  if (fill_prev.categorical && fill_prev.categorical instanceof Array) {
    setSelected(field_selec.node(), fill_prev.categorical[0]);
  }
  field_selec.on('change', function () {
    const field_name = this.value,
      data_layer = current_layers[layer].is_result ? result_data[layer] : user_data[layer],
      values = data_layer.map(i => i[field_name]),
      cats = new Set(values),
      txt = [cats.size, ' cat.'].join('');
    d3.select('#nb_cat_txt').html(txt);
    const color_cat_map = new Map();
    Array.from(cats.keys()).forEach((val) => {
      color_cat_map.set(val, Colors.names[Colors.random()]);
    });
    // for (let val of cats) {
    //   color_cat_map.set(val, Colors.names[Colors.random()]);
    // }
    current_layers[layer].fill_color = { categorical: [field_name, color_cat_map] };
    fill_categorical(layer, field_name, symbol, color_cat_map);
  });

  if ((!fill_prev || !fill_prev.categorical) && field_selec.node().options.length > 0) {
    setSelected(field_selec.node(), field_selec.node().options[0].value);
  }
  fill_color_section.append('span').attr('id', 'nb_cat_txt').html('');
}

/**
* Function to create the input section allowing to change the name of a layer.
* (Used by all the createStyleBox_xxx functions)
*
* @param {Object} parent - A d3 selection corresponding to the parent box.
* @param {String} layer_name - The current name of layer edited in the style box.
* @return {Object} - The d3 selection corresponding to the input element created.
*/
function make_change_layer_name_section(parent, layer_name) {
  const section = parent.insert('p')
    .attr('class', 'inp_bottom');
  section.append('span')
    .html(i18next.t('app_page.layer_style_popup.layer_name'));
  const inpt = section.append('input')
    .attrs({ id: 'lyr_change_name', type: 'text' })
    .styles({ width: '200px', float: 'left' });
  inpt.node().value = layer_name;
  return inpt;
}

function createStyleBoxTypoSymbols(layer_name) {
  function get_prev_settings() {
    const features = selection._groups[0];
    for (let i = 0; i < features.length; i++) {
      prev_settings.push({
        display: features[i].style.display ? features[i].style.display : null,
        size: features[i].getAttribute('width'),
        position: [features[i].getAttribute('x'), features[i].getAttribute('y')],
      });
    }
    prev_settings_defaults.size = current_layers[layer_name].default_size;
  }

  const restore_prev_settings = () => {
    const features = selection._groups[0];
    for (let i = 0; i < features.length; i++) {
      features[i].setAttribute('width', prev_settings[i].size);
      features[i].setAttribute('height', prev_settings[i].size);
      features[i].setAttribute('x', prev_settings[i].position[0]);
      features[i].setAttribute('y', prev_settings[i].position[1]);
      features[i].style.display = prev_settings[i].display;
    }
    current_layers[layer_name].default_size = prev_settings_defaults.size;
  };

  check_remove_existing_box('.styleBox');

  const selection = map.select(`#${_app.layer_to_id.get(layer_name)}`).selectAll('image'),
    ref_layer_name = current_layers[layer_name].ref_layer_name,
    symbols_map = current_layers[layer_name].symbols_map,
    rendered_field = current_layers[layer_name].rendered_field;

  const prev_settings = [],
    prev_settings_defaults = {},
    zs = d3.zoomTransform(svg_map).k;

  get_prev_settings();

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (!confirmed) {
        restore_prev_settings();
      } else if (new_layer_name !== layer_name) {
        change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content').style('width', '300px')
    .select('.modal-body');

  popup.append('p')
    .styles({ 'text-align': 'center', color: 'grey' })
    .html([
      i18next.t('app_page.layer_style_popup.rendered_field', { field: rendered_field }),
      i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name }),
    ].join(''));

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
  popup.append('p').style('text-align', 'center')
    .insert('button')
    .attrs({ id: 'reset_symb_loc', class: 'button_st4' })
    .text(i18next.t('app_page.layer_style_popup.reset_symbols_location'))
    .on('click', () => {
      selection.transition()
        .attrs((d) => {
          const centroid = path.centroid(d.geometry),
            size_symbol = symbols_map.get(d.properties.symbol_field)[1] / 2;
          return { x: centroid[0] - size_symbol, y: centroid[1] - size_symbol };
        });
    });

  popup.append('p').style('text-align', 'center')
    .insert('button')
    .attrs({ id: 'reset_symb_display', class: 'button_st4' })
    .text(i18next.t('app_page.layer_style_popup.redraw_symbols'))
    .on('click', () => {
      selection.style('display', undefined);
    });

  const size_section = popup.append('p');
  size_section.append('span')
    .html(i18next.t('app_page.layer_style_popup.symbols_size'));
  size_section.append('input')
    .attrs({ min: 0, max: 200, step: 'any', value: 32, type: 'number' })
    .styles({ width: '60px', margin: 'auto' })
    .on('change', function () {
      const value = this.value;
      selection.transition()
        .attrs(function () {
          const current_size = this.height.baseVal.value;
          return {
            width: `${value}px`,
            height: `${value}px`,
            x: this.x.baseVal.value + current_size / 2 - value / 2,
            y: this.y.baseVal.value + current_size / 2 - value / 2,
          };
        });
    });
}
  //  popup.append("p").style("text-align", "center")
  //    .insert("button")
  //    .attr("id","modif_symb")
  //    .attr("class", "button_st4")
  //    .text(i18next.t("app_page.layer_style_popup.modify_symbols"))
  //    .on("click", function(){
  //      display_box_symbol_typo(ref_layer_name, rendered_field)().then(function(confirmed){
  //        if(confirmed){
  //          rendering_params = {
  //              nb_cat: confirmed[0],
  //              symbols_map: confirmed[1],
  //              field: rendered_field
  //          };
  //          map.select("#" + layer_name)
  //            .selectAll("image")
  //            .attr("x",
  //               d => d.coords[0] - rendering_params.symbols_map.get(d.Symbol_field)[1] / 2)
  //            .attr("y",
  //               d => d.coords[1] - rendering_params.symbols_map.get(d.Symbol_field)[1] / 2)
  //            .attr("width",
  //               d => rendering_params.symbols_map.get(d.Symbol_field)[1] + "px")
  //            .attr("height",
  //               d => rendering_params.symbols_map.get(d.Symbol_field)[1] + "px")
  //            .attr("xlink:href",
  //               (d, i) => rendering_params.symbols_map.get(d.Symbol_field)[0]);
  //        }
  //      });
  //    });

function createStyleBoxLabel(layer_name) {
  function get_prev_settings() {
    const features = selection._groups[0];
    prev_settings = [];
    for (let i = 0; i < features.length; i++) {
      prev_settings.push({
        color: features[i].style.fill,
        size: features[i].style.fontSize,
        display: features[i].style.display ? features[i].style.display : null,
        position: [features[i].getAttribute('x'), features[i].getAttribute('y')],
        font: features[i].style.fontFamily,
      });
    }
    prev_settings_defaults = {
      color: current_layers[layer_name].fill_color,
      size: current_layers[layer_name].default_size,
      font: current_layers[layer_name].default_font,
    };
  }

  function restore_prev_settings() {
    const features = selection._groups[0];
    for (let i = 0; i < features.length; i++) {
      features[i].style.fill = prev_settings[i].color;
      features[i].style.fontSize = prev_settings[i].size;
      features[i].style.display = prev_settings[i].display;
      features[i].setAttribute('x', prev_settings[i].position[0]);
      features[i].setAttribute('y', prev_settings[i].position[1]);
      features[i].style.fontFamily = prev_settings[i].font;
    }

    current_layers[layer_name].fill_color = prev_settings_defaults.color;
    current_layers[layer_name].default_size = prev_settings_defaults.size;
    current_layers[layer_name].default_font = prev_settings_defaults.font;
  }

  check_remove_existing_box('.styleBox');

  const selection = map.select(`#${_app.layer_to_id.get(layer_name)}`).selectAll('text'),
    ref_layer_name = current_layers[layer_name].ref_layer_name;
  const rendering_params = {};
  let prev_settings_defaults = {};
  let prev_settings = [];

  get_prev_settings();

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (!confirmed) {
        restore_prev_settings();
      } else {
        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content').style('width', '300px')
    .select('.modal-body');

  popup.append('p')
    .styles({ 'text-align': 'center', color: 'grey' })
    .html([
      i18next.t('app_page.layer_style_popup.rendered_field', { field: current_layers[layer_name].rendered_field }),
      i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name }),
    ].join(''));

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
  popup.append('p').style('text-align', 'center')
    .insert('button')
    .attrs({ id: 'reset_labels_loc', class: 'button_st4' })
    .text(i18next.t('app_page.layer_style_popup.reset_labels_location'))
    .on('click', () => {
      selection.transition()
        .attrs((d) => {
          const coords = path.centroid(d.geometry);
          return { x: coords[0], y: coords[1] };
        });
    });

  popup.append('p').style('text-align', 'center')
    .insert('button')
    .attr('id', 'reset_labels_display')
    .attr('class', 'button_st4')
    .text(i18next.t('app_page.layer_style_popup.redraw_labels'))
    .on('click', () => {
      selection.style('display', undefined);
    });

  popup.insert('p').style('text-align', 'center').style('font-size', '9px')
    .html(i18next.t('app_page.layer_style_popup.overrride_warning'));
  const label_sizes = popup.append('p').attr('class', 'line_elem');
  label_sizes.append('span')
    .html(i18next.t('app_page.layer_style_popup.labels_default_size'));
  label_sizes.insert('span')
    .style('float', 'right')
    .html(' px');
  label_sizes.insert('input')
    .styles({ float: 'right', width: '70px' })
    .attr('type', 'number')
    .attr('value', +current_layers[layer_name].default_size.replace('px', ''))
    .on('change', function () {
      const size = `${this.value}px`;
      current_layers[layer_name].default_size = size;
      selection.style('font-size', size);
    });

  const default_color = popup.insert('p').attr('class', 'line_elem');
  default_color.append('span')
    .html(i18next.t('app_page.layer_style_popup.labels_default_color'));
  default_color.insert('input')
    .style('float', 'right')
    .attrs({ type: 'color', value: current_layers[layer_name].fill_color })
    .on('change', function () {
      current_layers[layer_name].fill_color = this.value;
      selection.transition().style('fill', this.value);
    });

  const font_section = popup.insert('p').attr('class', 'line_elem');
  font_section.append('span').html(i18next.t('app_page.layer_style_popup.labels_default_font'));
  const choice_font = font_section.insert('select')
    .style('float', 'right')
    .on('change', function () {
      current_layers[layer_name].default_font = this.value;
      selection.transition().style('font-family', this.value);
    });

  available_fonts.forEach((name) => {
    choice_font.append('option').attr('value', name[1]).text(name[0]);
  });
  choice_font.node().value = current_layers[layer_name].default_font;
}

function createStyleBoxGraticule(layer_name) {
  check_remove_existing_box('.styleBox');
  const current_params = cloneObj(current_layers.Graticule);
  let selection = map.select('#Graticule > path');
  let selection_strokeW = map.select('#Graticule');

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        return null;
      } else {
        return null;
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content').style('width', '300px')
    .select('.modal-body');
  // let new_layer_name = layer_name;
  // const new_name_section = make_change_layer_name_section(popup, layer_name);
  // new_name_section.on('change', function() {
  //   new_layer_name = this.value;
  // });

  const color_choice = popup.append('p').attr('class', 'line_elem');
  color_choice.append('span').html(i18next.t('app_page.layer_style_popup.color'));
  color_choice.append('input')
    .style('float', 'right')
    .attrs({ type: 'color', value: current_params.fill_color.single })
    .on('change', function () {
      selection.style('stroke', this.value);
      current_layers.Graticule.fill_color.single = this.value;
    });

  const opacity_choice = popup.append('p').attr('class', 'line_elem');
  opacity_choice.append('span').html(i18next.t('app_page.layer_style_popup.opacity'));
  opacity_choice.append('input')
    .attrs({ type: 'range', value: current_params.opacity, min: 0, max: 1, step: 0.1 })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      selection.style('stroke-opacity', this.value);
      current_layers.Graticule.opacity = +this.value;
      popup.select('#graticule_opacity_txt').html(`${+this.value * 100}%`);
    });
  opacity_choice.append('span')
    .attr('id', 'graticule_opacity_txt')
    .style('float', 'right')
    .html(`${current_params.opacity * 100}%`);

  const stroke_width_choice = popup.append('p').attr('class', 'line_elem');
  stroke_width_choice.append('span').html(i18next.t('app_page.layer_style_popup.width'));
  stroke_width_choice.append('input')
    .attrs({ type: 'number', value: current_params['stroke-width-const'] })
    .styles({ width: '60px', float: 'right' })
    .on('change', function () {
      selection_strokeW.style('stroke-width', this.value);
      current_layers.Graticule['stroke-width-const'] = +this.value;
    });

  const steps_choice = popup.append('p').attr('class', 'line_elem');
  steps_choice.append('span').html(i18next.t('app_page.layer_style_popup.graticule_steps'));
  steps_choice.append('input')
    .attrs({ id: 'graticule_range_steps', type: 'range', value: current_params.step, min: 0, max: 100, step: 1 })
    .styles({ 'vertical-align': 'middle', width: '58px', display: 'inline', float: 'right' })
    .on('change', function () {
      const next_layer = selection_strokeW.node().nextSibling;
      const step_val = +this.value;
      const dasharray_val = +document.getElementById('graticule_dasharray_txt').value;
      current_layers.Graticule.step = step_val;
      map.select('#Graticule').remove();
      map.append('g')
        .attrs({ id: 'Graticule', class: 'layer' })
        .append('path')
        .datum(d3.geoGraticule().step([step_val, step_val]))
        .attrs({ class: 'graticule', d: path, 'clip-path': 'url(#clip)' })
        .styles({ fill: 'none', stroke: current_layers.Graticule.fill_color.single, 'stroke-dasharray': dasharray_val });
      zoom_without_redraw();
      selection = map.select('#Graticule').selectAll('path');
      selection_strokeW = map.select('#Graticule');
      svg_map.insertBefore(selection_strokeW.node(), next_layer);
      popup.select('#graticule_step_txt').attr('value', step_val);
    });
  steps_choice.append('input')
    .attrs({ type: 'number', value: current_params.step, min: 0, max: 100, step: 'any', class: 'without_spinner', id: 'graticule_step_txt' })
    .styles({ width: '30px', 'margin-left': '10px', float: 'right' })
    .on('change', function () {
      const grat_range = document.getElementById('graticule_range_steps');
      grat_range.value = +this.value;
      grat_range.dispatchEvent(new MouseEvent('change'));
    });

  const dasharray_choice = popup.append('p').attr('class', 'line_elem');
  dasharray_choice.append('span').html(i18next.t('app_page.layer_style_popup.graticule_dasharray'));
  dasharray_choice.append('input')
    .attrs({ type: 'range', value: current_params.dasharray, min: 0, max: 50, step: 0.1, id: 'graticule_range_dasharray' })
    .styles({ 'vertical-align': 'middle', width: '58px', display: 'inline', float: 'right' })
    .on('change', function () {
      selection.style('stroke-dasharray', this.value);
      current_layers.Graticule.dasharray = +this.value;
      popup.select('#graticule_dasharray_txt').attr('value', this.value);
    });
  dasharray_choice.append('input')
    .attrs({ type: 'number', value: current_params.dasharray, min: 0, max: 100, step: 'any', class: 'without_spinner', id: 'graticule_dasharray_txt' })
    .styles({ width: '30px', 'margin-left': '10px', float: 'right' })
    .on('change', function () {
      const grat_range = document.getElementById('graticule_range_dasharray');
      grat_range.value = +this.value;
      grat_range.dispatchEvent(new MouseEvent('change'));
    });

  const clip_extent_section = popup.append('p').attr('class', 'line_elem');
  clip_extent_section.append('input')
    .attrs({ type: 'checkbox', id: 'clip_graticule', checked: current_params.extent ? true : null })
    .on('change', function () {
      const next_layer = selection_strokeW.node().nextSibling,
        step_val = +document.getElementById('graticule_step_txt').value,
        dasharray_val = +document.getElementById('graticule_dasharray_txt').value;
      let graticule = d3.geoGraticule().step([step_val, step_val]);
      map.select('#Graticule').remove();
      if (this.checked) {
        const bbox_layer = _target_layer_file.bbox;
        const extent_grat = [
          [Math.round((bbox_layer[0] - 12) / 10) * 10, Math.round((bbox_layer[1] - 12) / 10) * 10],
          [Math.round((bbox_layer[2] + 12) / 10) * 10, Math.round((bbox_layer[3] + 12) / 10) * 10],
        ];

        if (extent_grat[0] < -180) extent_grat[0] = -180;
        if (extent_grat[1] < -90) extent_grat[1] = -90;
        if (extent_grat[2] > 180) extent_grat[2] = 180;
        if (extent_grat[3] > 90) extent_grat[3] = 90;
        graticule = graticule.extent(extent_grat);
        current_layers.Graticule.extent = extent_grat;
      } else {
        current_layers.Graticule.extent = undefined;
      }
      map.append('g')
        .attrs({ id: 'Graticule', class: 'layer' })
        .append('path')
        .datum(graticule)
        .attrs({ class: 'graticule', d: path, 'clip-path': 'url(#clip)' })
        .styles({ fill: 'none', stroke: current_layers.Graticule.fill_color.single, 'stroke-dasharray': dasharray_val });
      zoom_without_redraw();
      selection = map.select('#Graticule').selectAll('path');
      selection_strokeW = map.select('#Graticule');
      svg_map.insertBefore(selection_strokeW.node(), next_layer);
    });
  clip_extent_section.append('label')
    .attrs({ for: 'clip_graticule' })
    .html(i18next.t('app_page.layer_style_popup.graticule_clip'));

  make_generate_labels_graticule_section(popup);
}

/**
* Function triggered to redraw the legend after changing some properties on a layer.
*
* @param {String} type_legend - The type of the legend to redraw.
* @param {String} layer_name - The name of the layer concerned.
* @param {String} field - The name of the rendered field.
* @return {void}
*
*/
function redraw_legend(type_legend, layer_name, field) {
  const [selector, legend_func] = type_legend === 'default' ? [['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_choro] :
       type_legend === 'line_class' ? [['#legend_root_lines_class.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_discont_links] :
       type_legend === 'line_symbol' ? [['#legend_root_lines_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_line_symbol] :
       type_legend === 'waffle' ? [['#legend_root_waffle.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_waffle] : undefined;
  let lgd = document.querySelector(selector);
  if (lgd) {
    const transform_param = lgd.getAttribute('transform'),
      lgd_title = lgd.querySelector('#legendtitle').innerHTML,
      lgd_subtitle = lgd.querySelector('#legendsubtitle').innerHTML,
      rounding_precision = lgd.getAttribute('rounding_precision'),
      note = lgd.querySelector('#legend_bottom_note').innerHTML,
      boxgap = lgd.getAttribute('boxgap');
    const rect_fill_value = (lgd.getAttribute('visible_rect') === 'true') ? {
      color: lgd.querySelector('#under_rect').style.fill,
      opacity: lgd.querySelector('#under_rect').style.fillOpacity,
    } : undefined;

    if (type_legend === 'default') {
      let no_data_txt = lgd.querySelector('#no_data_txt');
      no_data_txt = no_data_txt != null ? no_data_txt.textContent : null;

      lgd.remove();
      legend_func(layer_name,
           field,
           lgd_title,
           lgd_subtitle,
           boxgap,
           rect_fill_value,
           rounding_precision,
           no_data_txt,
           note);
    } else if (type_legend === 'waffle') {
      lgd.remove();
      legend_func(layer_name, field, lgd_title, lgd_subtitle, rect_fill_value, note);
    } else {
      lgd.remove();
      legend_func(layer_name,
                  current_layers[layer_name].rendered_field,
                  lgd_title,
                  lgd_subtitle,
                  rect_fill_value,
                  rounding_precision,
                  note);
    }
    lgd = document.querySelector(selector);
    if (transform_param) {
      lgd.setAttribute('transform', transform_param);
    }
  }
}

function createStyleBox_Line(layer_name) {
  check_remove_existing_box('.styleBox');
  const renderer = current_layers[layer_name].renderer,
    g_lyr_name = `#${_app.layer_to_id.get(layer_name)}`,
    selection = map.select(g_lyr_name).selectAll('path'),
    opacity = selection.style('fill-opacity');

  const fill_prev = cloneObj(current_layers[layer_name].fill_color);
  let prev_col_breaks;
  let rendering_params;

  if (current_layers[layer_name].colors_breaks
      && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }

  const border_opacity = selection.style('stroke-opacity'),
    stroke_width = +current_layers[layer_name]['stroke-width-const'];
  let stroke_prev = selection.style('stroke');
  let prev_min_display,
    prev_size,
    prev_breaks;

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  const table = [];
  Array.prototype.forEach.call(svg_map.querySelector(g_lyr_name).querySelectorAll('path'), (d) => {
    table.push(d.__data__.properties);
  });

  const redraw_prop_val = function (prop_values) {
    const selec = selection._groups[0];
    for (let i = 0, len = prop_values.length; i < len; i++) {
      selec[i].style.strokeWidth = prop_values[i];
    }
  };

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        if (renderer !== undefined && rendering_params !== undefined
              && renderer !== 'Categorical' && renderer !== 'PropSymbolsTypo') {
          current_layers[layer_name].fill_color = { class: rendering_params.colorsByFeature };
          const colors_breaks = [];
          for (let i = rendering_params.breaks.length - 1; i > 0; --i) {
            colors_breaks.push([
              [rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.breaks[i - 1],
            ]);
          }
          current_layers[layer_name].colors_breaks = colors_breaks;
          current_layers[layer_name].rendered_field = rendering_params.field;
          current_layers[layer_name].options_disc = {
            schema: rendering_params.schema,
            colors: rendering_params.colors,
            no_data: rendering_params.no_data,
            type: rendering_params.type,
            breaks: rendering_params.breaks,
            extra_options: rendering_params.extra_options,
          };
          redraw_legend('default', layer_name, rendering_params.field);
        } else if ((renderer === 'Categorical' || renderer === 'PropSymbolsTypo') && rendering_params !== undefined) {
          current_layers[layer_name].color_map = rendering_params.color_map;
          current_layers[layer_name].fill_color = {
            class: [].concat(rendering_params.colorsByFeature),
          };
          redraw_legend('default', layer_name, rendering_params.field);
        } else if (renderer === 'DiscLayer') {
          selection.each(function (d) {
            d.properties.prop_val = this.style.strokeWidth; // eslint-disable-line no-param-reassign
          });
          // Also change the legend if there is one displayed :
          redraw_legend('line_class', layer_name);
        } else if (renderer === 'Links') {
          selection.each(function (d, i) {
            current_layers[layer_name].linksbyId[i][2] = this.style.strokeWidth;
          });
          // Also change the legend if there is one displayed :
          redraw_legend('line_class', layer_name);
        }

        if (renderer.startsWith('PropSymbols')) {
          redraw_legend('line_symbol', layer_name);
        }

        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
        zoom_without_redraw();
      } else {
        // Reset to original values the rendering parameters if "no" is clicked
        selection.style('fill-opacity', opacity)
          .style('stroke-opacity', border_opacity);
        const zoom_scale = +d3.zoomTransform(map.node()).k;
        map.select(g_lyr_name).style('stroke-width', `${stroke_width / zoom_scale}px`);
        current_layers[layer_name]['stroke-width-const'] = stroke_width;
        const fill_meth = Object.getOwnPropertyNames(fill_prev)[0];

        if (current_layers[layer_name].renderer === 'Links' && prev_min_display !== undefined) {
          current_layers[layer_name].min_display = prev_min_display;
          current_layers[layer_name].breaks = prev_breaks;
          selection.style('fill-opacity', 0)
            .style('stroke', fill_prev.single)
            .style('display', d => ((+d.properties[current_layers[layer_name].rendered_field] > prev_min_display) ? null : 'none'))
            .style('stroke-opacity', border_opacity)
            .style('stroke-width', (d, i) => current_layers[layer_name].linksbyId[i][2]);
        } else if (current_layers[layer_name].renderer === 'DiscLayer' && prev_min_display !== undefined) {
          current_layers[layer_name].min_display = prev_min_display;
          current_layers[layer_name].size = prev_size;
          current_layers[layer_name].breaks = prev_breaks;
          const lim = prev_min_display !== 0
            ? prev_min_display * current_layers[layer_name].n_features
            : -1;
          selection.style('fill-opacity', 0)
           .style('stroke', fill_prev.single)
           .style('stroke-opacity', border_opacity)
           .style('display', (d, i) => (+i <= lim ? null : 'none'))
           .style('stroke-width', d => d.properties.prop_val);
        } else {
          if (fill_meth === 'single') {
            selection.style('stroke', fill_prev.single)
             .style('stroke-opacity', border_opacity);
          } else if (fill_meth === 'random') {
            selection.style('stroke-opacity', border_opacity)
             .style('stroke', () => Colors.names[Colors.random()]);
          } else if (fill_meth === 'class' && renderer === 'Links') {
            selection.style('stroke-opacity', (d, i) => current_layers[layer_name].linksbyId[i][0])
             .style('stroke', stroke_prev);
          }
        }
        if (current_layers[layer_name].colors_breaks) {
          current_layers[layer_name].colors_breaks = prev_col_breaks;
        }
        current_layers[layer_name].fill_color = fill_prev;
        zoom_without_redraw();
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content').style('width', '300px')
    .select('.modal-body');

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  if (renderer === 'Categorical' || renderer === 'PropSymbolsTypo') {
    const color_field = renderer === 'Categorical'
      ? current_layers[layer_name].rendered_field
      : current_layers[layer_name].rendered_field2;

    popup.insert('p')
      .styles({ margin: 'auto', 'text-align': 'center' })
      .append('button')
      .attr('class', 'button_disc')
      .styles({ 'font-size': '0.8em', 'text-align': 'center' })
      .html(i18next.t('app_page.layer_style_popup.choose_colors'))
      .on('click', () => {
        const [cats, _] = prepare_categories_array(
          layer_name, color_field, current_layers[layer_name].color_map);
        container.modal.hide();
        display_categorical_box(result_data[layer_name], layer_name, color_field, cats)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                color_map: confirmed[1],
                colorsByFeature: confirmed[2],
                renderer: 'Categorical',
                rendered_field: color_field,
                field: color_field,
              };
              selection.transition()
                .style('stroke', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else if (renderer === 'Choropleth' || renderer === 'PropSymbolsChoro') {
    popup.append('p')
      .styles({ margin: 'auto', 'text-align': 'center' })
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_discretization'))
      .on('click', () => {
        container.modal.hide();
        display_discretization(layer_name,
                               current_layers[layer_name].rendered_field,
                               current_layers[layer_name].colors_breaks.length,
                               current_layers[layer_name].options_disc)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                type: confirmed[1],
                breaks: confirmed[2],
                colors: confirmed[3],
                colorsByFeature: confirmed[4],
                schema: confirmed[5],
                no_data: confirmed[6],
                // renderer:"Choropleth",
                field: current_layers[layer_name].rendered_field,
                extra_options: confirmed[7],
              };
              selection.transition()
                .style('stroke', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else {
    const c_section = popup.append('p').attr('class', 'line_elem');
    c_section.insert('span')
      .html(i18next.t('app_page.layer_style_popup.color'));
    c_section.insert('input')
      .attrs({ type: 'color', value: stroke_prev })
      .style('float', 'right')
      .on('change', function () {
        selection.style('stroke', this.value);
        current_layers[layer_name].fill_color = { single: this.value };
        // current_layers[layer_name].fill_color.single = this.value;
      });
  }

  if (renderer === 'Links') {
    prev_min_display = current_layers[layer_name].min_display || 0;
    prev_breaks = current_layers[layer_name].breaks.slice();
    const fij_field = current_layers[layer_name].rendered_field;
    let max_val = 0;
    selection.each((d) => {
      if (+d.properties[fij_field] > max_val) max_val = +d.properties[fij_field];
    });
    const threshold_section = popup.append('p').attr('class', 'line_elem');
    threshold_section.append('span').html(i18next.t('app_page.layer_style_popup.display_flow_larger'));
    // The legend will be updated in order to start on the minimum value displayed instead of
    //   using the minimum value of the serie (skipping unused class if necessary)
    threshold_section.insert('input')
      .attrs({ type: 'range', min: 0, max: max_val, step: 0.5, value: prev_min_display })
      .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' })
      .on('change', function () {
        const val = +this.value;
        popup.select('#larger_than').html(['<i> ', val, ' </i>'].join(''));
        selection.style('display', d => ((+d.properties[fij_field] > val) ? null : 'none'));
        current_layers[layer_name].min_display = val;
      });
    threshold_section.insert('label')
      .attr('id', 'larger_than')
      .style('float', 'right')
      .html(`<i> ${prev_min_display} </i>`);
    popup.append('p')
      .style('text-align', 'center')
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.modify_size_class'))
      .on('click', () => {
        container.modal.hide();
        display_discretization_links_discont(layer_name,
                                             current_layers[layer_name].rendered_field,
                                             current_layers[layer_name].breaks.length,
                                             'user_defined')
          .then((result) => {
            container.modal.show();
            if (result) {
              const serie = result[0],
                sizes = result[1].map(ft => ft[1]),
                links_byId = current_layers[layer_name].linksbyId;
              serie.setClassManually(result[2]);
              current_layers[layer_name].breaks = result[1];
              selection.style('fill-opacity', 0)
                .style('stroke-width', (d, i) => sizes[serie.getClass(+links_byId[i][1])]);
            }
          });
      });
  } else if (renderer === 'DiscLayer') {
    prev_min_display = current_layers[layer_name].min_display || 0;
    prev_size = current_layers[layer_name].size.slice();
    prev_breaks = current_layers[layer_name].breaks.slice();
    const max_val = Math.max.apply(null, result_data[layer_name].map(i => i.disc_value));
    const disc_part = popup.append('p').attr('class', 'line_elem');
    disc_part.append('span').html(i18next.t('app_page.layer_style_popup.discont_threshold'));
    disc_part.insert('input')
      .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: prev_min_display })
      .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' })
      .on('change', function () {
        const val = +this.value;
        const lim = val !== 0 ? val * current_layers[layer_name].n_features : -1;
        popup.select('#larger_than').html(['<i> ', val * 100, ' % </i>'].join(''));
        selection.style('display', (d, i) => (i <= lim ? null : 'none'));
        current_layers[layer_name].min_display = val;
      });
    disc_part.insert('label')
      .attr('id', 'larger_than')
      .style('float', 'right')
      .html(['<i> ', prev_min_display * 100, ' % </i>'].join(''));
    popup.append('p')
      .style('text-align', 'center')
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_discretization'))
      .on('click', () => {
        container.modal.hide();
        display_discretization_links_discont(layer_name,
                                             'disc_value',
                                             current_layers[layer_name].breaks.length,
                                             'user_defined')
          .then((result) => {
            container.modal.show();
            if (result) {
              const serie = result[0],
                sizes = result[1].map(ft => ft[1]);

              serie.setClassManually(result[2]);
              current_layers[layer_name].breaks = result[1];
              current_layers[layer_name].size = [sizes[0], sizes[sizes.length - 1]];
              selection.style('fill-opacity', 0)
                .style('stroke-width', (d, i) => sizes[serie.getClass(+d.properties.disc_value)]);
            }
          });
      });
  }

  const opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span')
    .html(i18next.t('app_page.layer_style_popup.opacity'));
  opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      opacity_section.select('#opacity_val_txt').html(` ${this.value}`);
      selection.style('stroke-opacity', this.value);
    });

  opacity_section.append('span').attr('id', 'opacity_val_txt')
     .style('display', 'inline').style('float', 'right')
     .html(` ${border_opacity}`);

  if (!renderer || (!renderer.startsWith('PropSymbols') && renderer !== 'DiscLayer' && renderer !== 'Links')) {
    const width_section = popup.append('p');
    width_section.append('span')
      .html(i18next.t('app_page.layer_style_popup.width'));
    width_section.insert('input')
      .attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width })
      .styles({ width: '60px', float: 'right' })
      .on('change', function () {
        const val = +this.value;
        const zoom_scale = +d3.zoomTransform(map.node()).k;
        map.select(g_lyr_name).style('stroke-width', `${val / zoom_scale}px`);
        current_layers[layer_name]['stroke-width-const'] = val;
      });
  } else if (renderer.startsWith('PropSymbols')) {
    const field_used = current_layers[layer_name].rendered_field;
    const d_values = result_data[layer_name].map(f => +f[field_used]);
    const prop_val_content = popup.append('p');
    prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.field_symbol_size', { field: current_layers[layer_name].rendered_field }));
    prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.symbol_fixed_size'));
    prop_val_content.insert('input')
      .styles({ width: '60px', float: 'right' })
      .attrs({ type: 'number', id: 'max_size_range', min: 0.1, step: 'any', value: current_layers[layer_name].size[1] })
      .on('change', function () {
        const f_size = +this.value;
        const prop_values = prop_sizer3_e(d_values, current_layers[layer_name].size[0], f_size, 'line');
        current_layers[layer_name].size[1] = f_size;
        redraw_prop_val(prop_values);
      });
    prop_val_content.append('span')
        .style('float', 'right')
        .html('(px)');

    const prop_val_content2 = popup.append('p').attr('class', 'line_elem');
    prop_val_content2.append('span').html(i18next.t('app_page.layer_style_popup.on_value'));
    prop_val_content2.insert('input')
      .styles({ width: '100px', float: 'right' })
      .attrs({ type: 'number', min: 0.1, step: 0.1, value: +current_layers[layer_name].size[0] })
      .on('change', function () {
        const f_val = +this.value;
        const prop_values = prop_sizer3_e(d_values, f_val, current_layers[layer_name].size[1], 'line');
        redraw_prop_val(prop_values);
        current_layers[layer_name].size[0] = f_val;
      });
  }

  make_generate_labels_section(popup, layer_name);
}

function createStyleBox(layer_name) {
  check_remove_existing_box('.styleBox');
  const type = current_layers[layer_name].type,
    isSphere = current_layers[layer_name].sphere === true,
    renderer = current_layers[layer_name].renderer,
    g_lyr_name = `#${_app.layer_to_id.get(layer_name)}`,
    selection = map.select(g_lyr_name).selectAll('path'),
    opacity = selection.style('fill-opacity');
  const fill_prev = cloneObj(current_layers[layer_name].fill_color);
  let prev_col_breaks;
  let rendering_params;
  if (current_layers[layer_name].colors_breaks
      && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }
  const border_opacity = selection.style('stroke-opacity'),
    stroke_width = +current_layers[layer_name]['stroke-width-const'];
  const table = [];
  let stroke_prev = selection.style('stroke');
  let prev_min_display,
    prev_size,
    prev_breaks,
    current_pt_size;

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  Array.prototype.forEach.call(svg_map.querySelector(g_lyr_name).querySelectorAll('path'), (d) => {
    table.push(d.__data__.properties);
  });
  const fields_layer = !isSphere ? current_layers[layer_name].fields_type || type_col2(table) : [];

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        // Update the object holding the properties of the layer if Yes is clicked
        if (type === 'Point' && current_layers[layer_name].pointRadius) {
          current_layers[layer_name].pointRadius = +current_pt_size;
        }
        if (renderer !== undefined
             && rendering_params !== undefined && renderer !== 'Categorical') {
          current_layers[layer_name].fill_color = { class: rendering_params.colorsByFeature };
          const colors_breaks = [];
          for (let i = rendering_params.breaks.length - 1; i > 0; --i) {
            colors_breaks.push([
              [rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.colors[i - 1],
            ]);
          }
          current_layers[layer_name].colors_breaks = colors_breaks;
          current_layers[layer_name].rendered_field = rendering_params.field;
          current_layers[layer_name].options_disc = {
            schema: rendering_params.schema,
            colors: rendering_params.colors,
            no_data: rendering_params.no_data,
            type: rendering_params.type,
            breaks: rendering_params.breaks,
            extra_options: rendering_params.extra_options,
          };
        } else if (renderer === 'Categorical' && rendering_params !== undefined) {
          current_layers[layer_name].color_map = rendering_params.color_map;
          current_layers[layer_name].fill_color = {
            class: [].concat(rendering_params.colorsByFeature),
          };
        }

        if ((rendering_params !== undefined && rendering_params.field !== undefined)) {
          redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
        }
        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
        zoom_without_redraw();
      } else {
        // Reset to original values the rendering parameters if "no" is clicked
        selection.style('fill-opacity', opacity)
          .style('stroke-opacity', border_opacity);
        const zoom_scale = +d3.zoomTransform(map.node()).k;
        map.select(g_lyr_name).style('stroke-width', `${stroke_width / zoom_scale}px`);
        current_layers[layer_name]['stroke-width-const'] = stroke_width;
        const fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
        if (type === 'Point' && current_layers[layer_name].pointRadius) {
          selection.attr('d', path.pointRadius(+current_layers[layer_name].pointRadius));
        } else {
          if (fill_meth === 'single') {
            selection.style('fill', fill_prev.single)
              .style('stroke', stroke_prev);
          } else if (fill_meth === 'class') {
            selection.style('fill-opacity', opacity)
              .style('fill', (d, i) => fill_prev.class[i])
              .style('stroke-opacity', border_opacity)
              .style('stroke', stroke_prev);
          } else if (fill_meth === 'random') {
            selection.style('fill', () => Colors.names[Colors.random()])
              .style('stroke', stroke_prev);
          } else if (fill_meth === 'categorical') {
            fill_categorical(layer_name, fill_prev.categorical[0], 'path', fill_prev.categorical[1]);
          }
        }
        if (current_layers[layer_name].colors_breaks) {
          current_layers[layer_name].colors_breaks = prev_col_breaks;
        }
        current_layers[layer_name].fill_color = fill_prev;
        zoom_without_redraw();
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content')
    .style('width', '300px')
    .select('.modal-body');

  let new_layer_name = layer_name;
  if (layer_name !== 'World') {
    const new_name_section = make_change_layer_name_section(popup, layer_name);
    new_name_section.on('change', function () {
      new_layer_name = this.value;
    });
  }

  if (type === 'Point') {
    current_pt_size = current_layers[layer_name].pointRadius;
    const pt_size = popup.append('p').attr('class', 'line_elem');
    pt_size.append('span').html(i18next.t('app_page.layer_style_popup.point_radius'));
    pt_size.append('input')
      .attrs({ type: 'range', min: 0, max: 80, value: current_pt_size, id: 'point_radius_size' })
      .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' })
      .on('change', function () {
        current_pt_size = +this.value;
        document.getElementById('point_radius_size_txt').value = current_pt_size;
        selection.attr('d', path.pointRadius(current_pt_size));
      });
    pt_size.append('input')
      .attrs({ type: 'number', value: +current_pt_size, min: 0, max: 80, step: 'any', class: 'without_spinner', id: 'point_radius_size_txt' })
      .styles({ width: '30px', 'margin-left': '10px', float: 'right' })
      .on('change', function () {
        const pt_size_range = document.getElementById('point_radius_size');
        const old_value = pt_size_range.value;
        if (this.value === '' || isNaN(+this.value)) {
          this.value = old_value;
        } else {
          this.value = round_value(+this.value, 2);
          pt_size_range.value = this.value;
          selection.attr('d', path.pointRadius(this.value));
        }
      });
  }

  if (current_layers[layer_name].colors_breaks === undefined && renderer !== 'Categorical') {
    if (current_layers[layer_name].targeted || current_layers[layer_name].is_result) {
      const fields = getFieldsType('category', null, fields_layer);
      const fill_method = popup.append('p').html(i18next.t('app_page.layer_style_popup.fill_color')).insert('select');
      [[i18next.t('app_page.layer_style_popup.single_color'), 'single'],
       [i18next.t('app_page.layer_style_popup.categorical_color'), 'categorical'],
       [i18next.t('app_page.layer_style_popup.random_color'), 'random']].forEach((d, i) => {
         fill_method.append('option').text(d[0]).attr('value', d[1]);
       });
      popup.append('div').attrs({ id: 'fill_color_section' });
      fill_method.on('change', function () {
        d3.select('#fill_color_section').html('').on('click', null);
        if (this.value === 'single') {
          make_single_color_menu(layer_name, fill_prev);
        } else if (this.value === 'categorical') {
          make_categorical_color_menu(fields, layer_name, fill_prev);
        } else if (this.value === 'random') {
          make_random_color(layer_name);
        }
      });
      setSelected(fill_method.node(), Object.getOwnPropertyNames(fill_prev)[0]);
    } else {
      popup.append('div').attrs({ id: 'fill_color_section' });
      make_single_color_menu(layer_name, fill_prev);
    }
  } else if (renderer === 'Categorical') {
    const rendered_field = current_layers[layer_name].rendered_field;

    popup.insert('p')
      .styles({ margin: 'auto', 'text-align': 'center' })
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_colors'))
      .on('click', () => {
        container.modal.hide();
        const [cats, _] = prepare_categories_array(
          layer_name, rendered_field, current_layers[layer_name].color_map);
        display_categorical_box(result_data[layer_name], layer_name, rendered_field, cats)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                color_map: confirmed[1],
                colorsByFeature: confirmed[2],
                renderer: 'Categorical',
                rendered_field: rendered_field,
                field: rendered_field,
              };
              selection.transition()
                .style('fill', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else if (renderer === 'Choropleth') {
    popup.append('p')
      .styles({ margin: 'auto', 'text-align': 'center' })
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_discretization'))
      .on('click', () => {
        container.modal.hide();
        display_discretization(layer_name,
                               current_layers[layer_name].rendered_field,
                               current_layers[layer_name].colors_breaks.length,
                              //  "quantiles",
                               current_layers[layer_name].options_disc)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                type: confirmed[1],
                breaks: confirmed[2],
                colors: confirmed[3],
                colorsByFeature: confirmed[4],
                schema: confirmed[5],
                no_data: confirmed[6],
                //  renderer:"Choropleth",
                field: current_layers[layer_name].rendered_field,
                extra_options: confirmed[7],
              };
              //  let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
              selection.transition()
                .style('fill', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else if (renderer === 'Gridded') {
    const field_to_discretize = current_layers[layer_name].rendered_field;
    popup.append('p').style('margin', 'auto').style('text-align', 'center')
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_discretization'))
      .on('click', () => {
        container.modal.hide();
        display_discretization(layer_name,
                               field_to_discretize,
                               current_layers[layer_name].colors_breaks.length,
                              //  "quantiles",
                               current_layers[layer_name].options_disc)
            .then((confirmed) => {
              container.modal.show();
              if (confirmed) {
                rendering_params = {
                  nb_class: confirmed[0],
                  type: confirmed[1],
                  breaks: confirmed[2],
                  colors: confirmed[3],
                  colorsByFeature: confirmed[4],
                  schema: confirmed[5],
                  no_data: confirmed[6],
                  renderer: 'Choropleth',
                  field: field_to_discretize,
                  extra_options: confirmed[7],
                };
                // let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
                selection.transition()
                  .style('fill', (d, i) => rendering_params.colorsByFeature[i]);
              }
            });
      });
  }

  const fill_opacity_section = popup.append('p').attr('class', 'line_elem');
  fill_opacity_section.append('span')
    .html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' })
    .on('change', function () {
      selection.style('fill-opacity', this.value);
      fill_opacity_section.select('#fill_opacity_txt')
        .html(`${this.value * 100}%`);
    });
  fill_opacity_section.append('span')
    .style('float', 'right')
    .attr('id', 'fill_opacity_txt')
    .html(`${+opacity * 100}%`);

  const c_section = popup.append('p').attr('class', 'line_elem');
  c_section.insert('span')
    .html(i18next.t('app_page.layer_style_popup.border_color'));
  c_section.insert('input')
    .attrs({ type: 'color', value: stroke_prev })
    .style('float', 'right')
    .on('change', function () {
      selection.style('stroke', this.value);
    });

  const opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span')
    .html(i18next.t('app_page.layer_style_popup.border_opacity'));
  opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      opacity_section.select('#opacity_val_txt').html(` ${this.value}`);
      selection.style('stroke-opacity', this.value);
    });

  opacity_section.append('span')
    .attr('id', 'opacity_val_txt')
    .styles({ display: 'inline', float: 'right' })
    .html(` ${border_opacity}`);

  const width_section = popup.append('p');
  width_section.append('span')
    .html(i18next.t('app_page.layer_style_popup.border_width'));
  width_section.insert('input')
    .attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width })
    .styles({ width: '60px', float: 'right' })
    .on('change', function () {
      const val = +this.value;
      const zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', `${val / zoom_scale}px`);
      current_layers[layer_name]['stroke-width-const'] = val;
    });

  const shadow_section = popup.append('p');
  const chkbx = shadow_section.insert('input')
    .style('margin', '0')
    .attrs({
      type: 'checkbox',
      id: 'checkbox_shadow_layer',
      checked: map.select(g_lyr_name).attr('filter') ? true : null });
  shadow_section.insert('label')
    .attr('for', 'checkbox_shadow_layer')
    .html(i18next.t('app_page.layer_style_popup.layer_shadow'));
  chkbx.on('change', function () {
    if (this.checked) {
      createDropShadow(_app.layer_to_id.get(layer_name));
    } else {
      const filter_id = map.select(g_lyr_name).attr('filter');
      svg_map.querySelector(filter_id.substring(4).replace(')', '')).remove();
      map.select(g_lyr_name).attr('filter', null);
    }
  });
  make_generate_labels_section(popup, layer_name);
}

function createStyleBoxStewart(layer_name) {
  check_remove_existing_box('.styleBox');
  const g_lyr_name = `#${_app.layer_to_id.get(layer_name)}`,
    selection = map.select(g_lyr_name).selectAll('path'),
    opacity = selection.style('fill-opacity');

  const nb_ft = current_layers[layer_name].n_features;
  const prev_palette = cloneObj(current_layers[layer_name].color_palette);

  const recolor_stewart = function (coloramp_name, reversed) {
    const new_coloramp = getColorBrewerArray(nb_ft, coloramp_name);
    if (reversed) new_coloramp.reverse();
    for (let i = 0; i < nb_ft; ++i) {
      rendering_params.breaks[i][1] = new_coloramp[i];
    }
    selection.transition().style('fill', (d, i) => new_coloramp[i]);
    current_layers[layer_name].color_palette = { name: coloramp_name, reversed: reversed };
  };
  const fill_prev = cloneObj(current_layers[layer_name].fill_color);
  const rendering_params = { breaks: [].concat(current_layers[layer_name].colors_breaks) };
  let prev_col_breaks;
  if (current_layers[layer_name].colors_breaks
      && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }
  const border_opacity = selection.style('stroke-opacity'),
    stroke_width = +current_layers[layer_name]['stroke-width-const'];
  let stroke_prev = selection.style('stroke');

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        current_layers[layer_name].colors_breaks = rendering_params.breaks;
        current_layers[layer_name].fill_color.class = rendering_params.breaks.map(obj => obj[1]);
        redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
        zoom_without_redraw();
      } else {
        // Reset to original values the rendering parameters if "no" is clicked
        selection.style('fill-opacity', opacity)
          .style('stroke-opacity', border_opacity);
        const zoom_scale = +d3.zoomTransform(map.node()).k;
        map.select(g_lyr_name).style('stroke-width', `${stroke_width / zoom_scale}px`);
        current_layers[layer_name]['stroke-width-const'] = stroke_width;
        const fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
        recolor_stewart(prev_palette.name, prev_palette.reversed);
        redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
        current_layers[layer_name].colors_breaks = prev_col_breaks;
        current_layers[layer_name].fill_color = fill_prev;
        zoom_without_redraw();
      }
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content')
    .style('width', '300px')
    .select('.modal-body');

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  const color_palette_section = popup.insert('p').attr('class', 'line_elem');
  color_palette_section.append('span').html(i18next.t('app_page.layer_style_popup.color_palette'));
  const seq_color_select = color_palette_section.insert('select')
    .attr('id', 'coloramp_params')
    .style('float', 'right')
    .on('change', function () {
      recolor_stewart(this.value, false);
    });

  [
    'Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn',
    'Greens', 'Greys', 'Oranges', 'Purples', 'Reds',
  ].forEach((name) => {
    seq_color_select.append('option')
      .text(name)
      .attr('value', name);
  });
  seq_color_select.node().value = prev_palette.name;
  popup.insert('p')
    .attr('class', 'line_elem')
    .styles({ 'text-align': 'center', margin: '0 !important' })
    .insert('button')
    .attrs({ class: 'button_st3', id: 'reverse_colramp' })
    .html(i18next.t('app_page.layer_style_popup.reverse_palette'))
    .on('click', () => {
      const pal_name = document.getElementById('coloramp_params').value;
      recolor_stewart(pal_name, true);
    });

  const fill_opacity_section = popup.append('p').attr('class', 'line_elem');
  fill_opacity_section.append('span')
    .html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' })
    .on('change', function () {
      selection.style('fill-opacity', this.value);
      fill_opacity_section.select('#fill_opacity_txt')
        .html(`${this.value * 100}%`);
    });
  fill_opacity_section.append('span')
    .style('float', 'right')
    .attr('id', 'fill_opacity_txt')
    .html(`${+opacity * 100}%`);

  const c_section = popup.append('p').attr('class', 'line_elem');
  c_section.insert('span')
    .html(i18next.t('app_page.layer_style_popup.border_color'));
  c_section.insert('input')
    .attrs({ type: 'color', value: stroke_prev })
    .style('float', 'right')
    .on('change', function () {
      selection.style('stroke', this.value);
    });

  const opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span')
    .html(i18next.t('app_page.layer_style_popup.border_opacity'));
  opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      opacity_section.select('#opacity_val_txt').html(` ${this.value}`);
      selection.style('stroke-opacity', this.value);
    });

  opacity_section.append('span')
    .attr('id', 'opacity_val_txt')
    .styles({ display: 'inline', float: 'right' })
    .html(` ${border_opacity}`);

  const width_section = popup.append('p');
  width_section.append('span')
    .html(i18next.t('app_page.layer_style_popup.border_width'));
  width_section.insert('input')
    .attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width })
    .styles({ width: '60px', float: 'right' })
    .on('change', function () {
      const val = +this.value;
      const zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', `${val / zoom_scale}px`);
      current_layers[layer_name]['stroke-width-const'] = val;
    });

  const shadow_section = popup.append('p');
  const chkbx = shadow_section.insert('input')
    .style('margin', '0')
    .attrs({
      type: 'checkbox',
      id: 'checkbox_shadow_layer',
      checked: map.select(g_lyr_name).attr('filter') ? true : null });
  shadow_section.insert('label')
    .attr('for', 'checkbox_shadow_layer')
    .html(i18next.t('app_page.layer_style_popup.layer_shadow'));
  chkbx.on('change', function () {
    if (this.checked) {
      createDropShadow(_app.layer_to_id.get(layer_name));
    } else {
      const filter_id = map.select(g_lyr_name).attr('filter');
      svg_map.querySelector(filter_id.substring(4).replace(')', '')).remove();
      map.select(g_lyr_name).attr('filter', null);
    }
  });
  make_generate_labels_section(popup, layer_name);
}


function make_generate_labels_graticule_section(parent_node) {
  const labels_section = parent_node.append('p');
  labels_section.append('span')
    .attr('id', 'generate_labels')
    .styles({ cursor: 'pointer', 'margin-top': '15px' })
    .html(i18next.t('app_page.layer_style_popup.generate_labels'))
    .on('mouseover', function () {
      this.style.fontWeight = 'bold';
    })
    .on('mouseout', function () {
      this.style.fontWeight = '';
    })
    .on('click', () => {
      render_label_graticule('Graticule', {
        color: '#000',
        font: 'Arial,Helvetica,sans-serif',
        ref_font_size: 12,
        uo_layer_name: ['Labels', 'Graticule'].join('_'),
      });
    });
}

/**
* Create the section allowing to generate labels on a parent style box.
* (Used by all the createStyleBox_xxx functions)
*
* @param {Object} parent_node - The d3 selection corresponding the parent style box.
* @param {String} layer_name - The name of the layer currently edited in the style box.
* @return {void}
*
*/
function make_generate_labels_section(parent_node, layer_name) {
  const _fields = get_fields_name(layer_name) || [];
  if (_fields && _fields.length > 0) {
    const labels_section = parent_node.append('p');
    const input_fields = {};
    for (let i = 0; i < _fields.length; i++) {
      input_fields[_fields[i]] = _fields[i];
    }
    labels_section.append('span')
      .attr('id', 'generate_labels')
      .styles({ cursor: 'pointer', 'margin-top': '15px' })
      .html(i18next.t('app_page.layer_style_popup.generate_labels'))
      .on('mouseover', function () {
        this.style.fontWeight = 'bold';
      })
      .on('mouseout', function () {
        this.style.fontWeight = '';
      })
      .on('click', () => {
        swal({
          title: '',
          text: i18next.t('app_page.layer_style_popup.field_label'),
          type: 'question',
          customClass: 'swal2_custom',
          showCancelButton: true,
          showCloseButton: false,
          allowEscapeKey: false,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.confirm'),
          input: 'select',
          inputPlaceholder: i18next.t('app_page.common.field'),
          inputOptions: input_fields,
          inputValidator: value => new Promise((resolve, reject) => {
            if (_fields.indexOf(value) < 0) {
              reject(i18next.t('app_page.common.no_value'));
            } else {
              render_label(layer_name, {
                label_field: value,
                color: '#000',
                font: 'Arial,Helvetica,sans-serif',
                ref_font_size: 12,
                uo_layer_name: ['Labels', value, layer_name].join('_'),
              });
              resolve();
            }
          }),
        }).then((value) => {
          console.log(value);
        }, (dismiss) => {
          console.log(dismiss);
        });
      });
  }
}

/**
* Return the name of the fields/columns
* (ie. the members of the `properties` Object for each feature on a layer)
*
* @param {String} layer_name - The name of the layer.
* @return {Array} - An array of Strings, one for each field name.
*
*/
function get_fields_name(layer_name) {
  const elem = document.getElementById(_app.layer_to_id.get(layer_name)).childNodes[0];
  if (!elem.__data__ || !elem.__data__.properties) {
    return null;
  }
  return Object.getOwnPropertyNames(elem.__data__.properties);
}

function createStyleBoxWaffle(layer_name) {
  check_remove_existing_box('.styleBox');
  const round = Math.round;
  const floor = Math.floor;
  const layer_id = _app.layer_to_id.get(layer_name),
    g_lyr_name = `#${layer_id}`,
    ref_layer_name = current_layers[layer_name].ref_layer_name,
    symbol = current_layers[layer_name].symbol,
    fields = current_layers[layer_name].rendered_field,
    selection = map.select(g_lyr_name);

  const previous_params = {
    fill_opacity: selection.selectAll(symbol).style('fill-opacity'),
    ref_colors: [].concat(current_layers[layer_name].fill_color),
    size: current_layers[layer_name].size,
    nCol: current_layers[layer_name].nCol,
  };

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        redraw_legend('waffle', layer_name, fields);
        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
      } else {
        current_layers[layer_name].fill_color = previous_params.ref_colors;
        current_layers[layer_name].size = previous_params.size;
        selection.selectAll(symbol).style('fill-opacity', previous_params.fill_opacity);
      }
      zoom_without_redraw();
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content')
    .style('width', '300px')
    .select('.modal-body');

  popup.append('p')
    .styles({ 'text-align': 'center', color: 'grey' })
    .html([
      i18next.t('app_page.layer_style_popup.rendered_field', { field: fields.join(' ,') }),
      i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name }),
    ].join(''));

  const fill_opacity_section = popup.append('p')
    .attr('class', 'line_elem')
    .attr('id', 'fill_color_section');

  fill_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: previous_params.fill_opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      selection.selectAll(symbol).style('fill-opacity', +this.value);
      fill_opacity_section.select('#fill_opacity_txt').html(`${+this.value * 100}%`);
    });

  fill_opacity_section.append('span')
    .attr('id', 'fill_opacity_txt')
    .style('float', 'right')
    .html(`${+previous_params.fill_opacity * 100}%`);

  const ref_colors_section = popup.append('div')
    .attr('id', 'ref_colors_section')
    .style('clear', 'both');
  ref_colors_section.append('p')
    .html(i18next.t('app_page.layer_style_popup.ref_colors'));
  for (let i = 0; i < current_layers[layer_name].fill_color.length; i++) {
    const p = ref_colors_section.append('p').style('margin', '15px 5px');
    p.append('span').html(current_layers[layer_name].rendered_field[i]);
    p.insert('input')
      .attr('type', 'color')
      .attr('id', i)
      .attr('value', current_layers[layer_name].fill_color[i])
      .style('float', 'right')
      .on('change', function () { // eslint-disable-line no-loop-func
        const col = rgb2hex(this.value);
        const to_replace = current_layers[layer_name].fill_color[i];
        current_layers[layer_name].fill_color[i] = col;
        selection.selectAll(symbol).each(function () {
          if (rgb2hex(this.getAttribute('fill')) === to_replace) {
            this.setAttribute('fill', col);
          }
        });
      });
  }

  const size_section = popup.append('p')
    .attr('class', 'line_elem')
    .attr('id', 'size_section')
    .style('clear', 'both');

  size_section.append('span').html(i18next.t('app_page.layer_style_popup.ref_size'));
  size_section.insert('input')
    .attrs({ type: 'range', min: 1, max: 40, step: 1, value: previous_params.size })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      const val = +this.value;
      const nCol = current_layers[layer_name].nCol;
      current_layers[layer_name].size = val;
      selection
        .selectAll('g')
        .selectAll(symbol)
        .each(function (d, i) {
          if (symbol === 'circle') {
            const t_x = round((i % nCol) * 2 * val);
            const t_y = floor(floor(i / nCol) * 2 * val);
            this.setAttribute('r', val);
            this.setAttribute('transform', `translate(-${t_x}, -${t_y})`);
          } else {
            const offset = val / 5;
            const t_x = round((i % nCol) * val) + (offset * round(i % nCol));
            const t_y = floor(floor(i / nCol) * val) + (offset * floor(i / nCol));
            this.setAttribute('width', val);
            this.setAttribute('height', val);
            this.setAttribute('transform', `translate(-${t_x}, -${t_y})`);
          }
        });
      size_section.select('#size_section_txt').html(`${this.value} px`);
    });
  size_section.append('span')
    .attr('id', 'size_section_txt')
    .style('float', 'right')
    .html(`${previous_params.size} px`);

  const width_row_section = popup.append('p')
    .attr('class', 'line_elem')
    .attr('id', 'width_row_section');

  width_row_section.append('span').html(i18next.t('app_page.func_options.twostocks.waffle_width_rows'));
  width_row_section.insert('input')
    .attrs({ type: 'range', min: 1, max: 10, step: 1, value: previous_params.nCol })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      const val = +this.value;
      const size = current_layers[layer_name].size;
      current_layers[layer_name].nCol = val;
      selection
        .selectAll('g')
        .selectAll(symbol)
        .each(function (d, i) {
          if (symbol === 'circle') {
            const t_x = round((i % val) * 2 * size);
            const t_y = floor(floor(i / val) * 2 * size);
            this.setAttribute('transform', `translate(-${t_x}, -${t_y})`);
          } else {
            const offset = size / 5;
            const t_x = round((i % val) * size) + (offset * round(i % val));
            const t_y = floor(floor(i / val) * size) + (offset * floor(i / val));
            this.setAttribute('transform', `translate(-${t_x}, -${t_y})`);
          }
        });
      width_row_section.select('#width_row_text').html(this.value);
    });
  width_row_section.append('span')
    .attr('id', 'width_row_text')
    .style('float', 'right')
    .html(previous_params.nCol);

  const allow_move_section = popup.append('p');
  const chkbx = allow_move_section.insert('input')
    .style('margin', '0')
    .attrs({
      type: 'checkbox',
      id: 'checkbox_move_symbol',
      checked: current_layers[layer_name].draggable ? true : null });
  allow_move_section.insert('label')
    .attr('for', 'checkbox_move_symbol')
    .html(i18next.t('app_page.layer_style_popup.let_draggable'));
  chkbx.on('change', function () {
    if (this.checked) {
      current_layers[layer_name].draggable = true;
    } else {
      current_layers[layer_name].draggable = false;
    }
  });

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
}

function createStyleBox_ProbSymbol(layer_name) {
  check_remove_existing_box('.styleBox');
  const layer_id = _app.layer_to_id.get(layer_name),
    g_lyr_name = `#${layer_id}`,
    ref_layer_name = current_layers[layer_name].ref_layer_name,
    type_method = current_layers[layer_name].renderer,
    type_symbol = current_layers[layer_name].symbol,
    field_used = current_layers[layer_name].rendered_field,
    selection = map.select(g_lyr_name).selectAll(type_symbol),
    old_size = [
      current_layers[layer_name].size[0],
      current_layers[layer_name].size[1],
    ];
  let rendering_params;
  let stroke_prev = selection.style('stroke');
  let stroke_width = selection.style('stroke-width');

  const opacity = selection.style('fill-opacity'),
    border_opacity = selection.style('stroke-opacity');

  const fill_prev = cloneObj(current_layers[layer_name].fill_color);
  const d_values = result_data[layer_name].map(v => +v[field_used]);
  let prev_col_breaks;
  const redraw_prop_val = (prop_values) => {
    const selec = selection._groups[0];

    if (type_symbol === 'circle') {
      for (let i = 0, len = prop_values.length; i < len; i++) {
        selec[i].setAttribute('r', prop_values[i]);
      }
    } else if (type_symbol === 'rect') {
      for (let i = 0, len = prop_values.length; i < len; i++) {
        const old_rect_size = +selec[i].getAttribute('height');
        const centr = [
          +selec[i].getAttribute('x') + (old_rect_size / 2) - (prop_values[i] / 2),
          +selec[i].getAttribute('y') + (old_rect_size / 2) - (prop_values[i] / 2),
        ];
        selec[i].setAttribute('x', centr[0]);
        selec[i].setAttribute('y', centr[1]);
        selec[i].setAttribute('height', prop_values[i]);
        selec[i].setAttribute('width', prop_values[i]);
      }
    }
  };

  if (current_layers[layer_name].colors_breaks
      && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = [].concat(current_layers[layer_name].colors_breaks);
  } else if (current_layers[layer_name].break_val !== undefined) {
    prev_col_breaks = current_layers[layer_name].break_val;
  }
  if (stroke_prev.startsWith('rgb')) stroke_prev = rgb2hex(stroke_prev);
  if (stroke_width.endsWith('px')) stroke_width = stroke_width.substring(0, stroke_width.length - 2);

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (confirmed) {
        // if(current_layers[layer_name].size != old_size){
        const lgd_prop_symb = document.querySelector(['#legend_root_symbol.lgdf_', layer_id].join(''));
        if (lgd_prop_symb) { redraw_legends_symbols(lgd_prop_symb); }
        if (type_symbol === 'circle') {
          selection.each(function (d, i) {
            d.properties.prop_value = this.getAttribute('r'); // eslint-disable-line no-param-reassign
            d.properties.color = rgb2hex(this.style.fill); // eslint-disable-line no-param-reassign
          });
        } else {
          selection.each(function (d, i) {
            d.properties.prop_value = this.getAttribute('height'); // eslint-disable-line no-param-reassign
            d.properties.color = rgb2hex(this.style.fill); // eslint-disable-line no-param-reassign
          });
        }

        if ((type_method === 'PropSymbolsChoro' || type_method === 'PropSymbolsTypo') && rendering_params !== undefined) {
          if (type_method === 'PropSymbolsChoro') {
            current_layers[layer_name].fill_color = {
              class: [].concat(rendering_params.colorsByFeature),
            };
            current_layers[layer_name].colors_breaks = [];
            for (let i = rendering_params.breaks.length - 1; i > 0; --i) {
              current_layers[layer_name].colors_breaks.push([
                [rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.colors[i - 1],
              ]);
            }
            current_layers[layer_name].options_disc = {
              schema: rendering_params.schema,
              colors: rendering_params.colors,
              no_data: rendering_params.no_data,
              type: rendering_params.type,
              breaks: rendering_params.breaks,
              extra_options: rendering_params.extra_options,
            };
          } else if (type_method === 'PropSymbolsTypo') {
            current_layers[layer_name].fill_color = {
              class: [].concat(rendering_params.colorsByFeature),
            };
            current_layers[layer_name].color_map = rendering_params.color_map;
          }
          current_layers[layer_name].rendered_field2 = rendering_params.field;
          // Also change the legend if there is one displayed :
          redraw_legend('default', layer_name, rendering_params.field);
        }
        // if(selection._groups[0][0].__data__.properties.color && rendering_params !== undefined){
        //     selection.each((d,i) => {
        //         d.properties.color = rendering_params.colorsByFeature[i];
        //     });
        // }
        // Change the layer name if requested :
        if (new_layer_name !== layer_name) {
          change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
        }
      } else {
        selection.style('fill-opacity', opacity);
        map.select(g_lyr_name).style('stroke-width', stroke_width);
        current_layers[layer_name]['stroke-width-const'] = stroke_width;
        const fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
        if (fill_meth === 'single') {
          selection.style('fill', fill_prev.single)
            .style('stroke-opacity', border_opacity)
            .style('stroke', stroke_prev);
        } else if (fill_meth === 'two') {
          current_layers[layer_name].break_val = prev_col_breaks;
          current_layers[layer_name].fill_color = { two: [fill_prev.two[0], fill_prev.two[1]] };
          selection.style('fill', (d, i) => (d_values[i] > prev_col_breaks ? fill_prev.two[1] : fill_prev.two[0]))
            .style('stroke-opacity', border_opacity)
            .style('stroke', stroke_prev);
        } else if (fill_meth === 'class') {
          selection.style('fill-opacity', opacity)
            .style('fill', (d, i) => current_layers[layer_name].fill_color.class[i])
            .style('stroke-opacity', border_opacity)
            .style('stroke', stroke_prev);
          current_layers[layer_name].colors_breaks = prev_col_breaks;
        } else if (fill_meth === 'random') {
          selection.style('fill', _ => Colors.names[Colors.random()])
            .style('stroke-opacity', border_opacity)
            .style('stroke', stroke_prev);
        } else if (fill_meth === 'categorical') {
          fill_categorical(layer_name,
                           fill_prev.categorical[0],
                           type_symbol,
                           fill_prev.categorical[1]);
        }
        current_layers[layer_name].fill_color = fill_prev;
        if (current_layers[layer_name].size[1] !== old_size[1]) {
          const prop_values = prop_sizer3_e(d_values, old_size[0], old_size[1], type_symbol);
          redraw_prop_val(prop_values);
          current_layers[layer_name].size = [old_size[0], old_size[1]];
        }
      }
      zoom_without_redraw();
    });

  const container = document.querySelector('.twbs > .styleBox');
  const popup = d3.select(container)
    .select('.modal-content')
    .style('width', '300px')
    .select('.modal-body');

  popup.append('p')
    .styles({ 'text-align': 'center', color: 'grey' })
    .html([
      i18next.t('app_page.layer_style_popup.rendered_field', { field: current_layers[layer_name].rendered_field }),
      i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name }),
    ].join(''));

  let new_layer_name = layer_name;
  const new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  if (type_method === 'PropSymbolsChoro') {
    const field_color = current_layers[layer_name].rendered_field2;
    popup.append('p')
      .styles({ margin: 'auto', 'text-align': 'center' })
      .html(i18next.t('app_page.layer_style_popup.field_symbol_color', { field: field_color }))
      .append('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_discretization'))
      .on('click', () => {
        container.modal.hide();
        display_discretization(layer_name,
                               field_color,
                               current_layers[layer_name].colors_breaks.length,
                              //  "quantiles",
                               current_layers[layer_name].options_disc)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                type: confirmed[1],
                breaks: confirmed[2],
                colors: confirmed[3],
                colorsByFeature: confirmed[4],
                schema: confirmed[5],
                no_data: confirmed[6],
                renderer: 'PropSymbolsChoro',
                field: field_color,
                extra_options: confirmed[7],
              };
              selection.style('fill', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else if (current_layers[layer_name].break_val !== undefined) {
    const fill_color_section = popup.append('div').attr('id', 'fill_color_section');
    fill_color_section.append('p')
      .style('text-align', 'center')
      .html(i18next.t('app_page.layer_style_popup.color_break'));
    const p2 = fill_color_section.append('p').style('display', 'inline');
    const col1 = p2.insert('input').attr('type', 'color')
      .attr('id', 'col1')
      .attr('value', current_layers[layer_name].fill_color.two[0])
      .on('change', function () {
        const new_break_val = +b_val.node().value;
        current_layers[layer_name].fill_color.two[0] = this.value;
        selection.transition().style('fill', (d, i) => ((d_values[i] > new_break_val) ? col2.node().value : this.value));
      });
    const col2 = p2.insert('input').attr('type', 'color')
      .attr('id', 'col2')
      .attr('value', current_layers[layer_name].fill_color.two[1])
      .on('change', function () {
        const new_break_val = +b_val.node().value;
        current_layers[layer_name].fill_color.two[1] = this.value;
        selection.transition()
          .style('fill', (d, i) => ((d_values[i] > new_break_val) ? this.value : col1.node().value));
      });
    fill_color_section.insert('span').html(i18next.t('app_page.layer_style_popup.break_value'));
    const b_val = fill_color_section.insert('input')
      .attrs({ type: 'number', value: current_layers[layer_name].break_val })
      .style('width', '75px')
      .on('change', function () {
        const new_break_val = +this.value;
        current_layers[layer_name].break_val = new_break_val;
        selection.transition().style('fill', (d, i) => ((d_values[i] > new_break_val) ? col2.node().value : col1.node().value));
      });
  } else if (type_method === 'PropSymbolsTypo') {
    const field_color = current_layers[layer_name].rendered_field2;
    popup.append('p')
      .style('margin', 'auto')
      .html(i18next.t('app_page.layer_style_popup.field_symbol_color', { field: field_color }));
    popup.append('p').style('text-align', 'center')
      .insert('button')
      .attr('class', 'button_disc')
      .html(i18next.t('app_page.layer_style_popup.choose_colors'))
      .on('click', () => {
        const [cats, _] = prepare_categories_array(
          layer_name, field_color, current_layers[layer_name].color_map);
        container.modal.hide();
        display_categorical_box(result_data[layer_name], layer_name, field_color, cats)
          .then((confirmed) => {
            container.modal.show();
            if (confirmed) {
              rendering_params = {
                nb_class: confirmed[0],
                color_map: confirmed[1],
                colorsByFeature: confirmed[2],
                renderer: 'Categorical',
                rendered_field: field_color,
                field: field_color,
              };
              selection.style('fill', (d, i) => rendering_params.colorsByFeature[i]);
            }
          });
      });
  } else {
    const fields_all = type_col2(result_data[layer_name]),
      fields = getFieldsType('category', null, fields_all),
      fill_method = popup.append('p').html(i18next.t('app_page.layer_style_popup.fill_color')).insert('select');

    [
      [i18next.t('app_page.layer_style_popup.single_color'), 'single'],
      [i18next.t('app_page.layer_style_popup.random_color'), 'random'],
    ].forEach((d) => {
      fill_method.append('option').text(d[0]).attr('value', d[1]);
    });
    popup.append('div').attr('id', 'fill_color_section');
    fill_method.on('change', function () {
      popup.select('#fill_color_section').html('').on('click', null);
      if (this.value === 'single') {
        make_single_color_menu(layer_name, fill_prev, type_symbol);
        map.select(g_lyr_name)
          .selectAll(type_symbol)
          .transition()
          .style('fill', fill_prev.single);
        current_layers[layer_name].fill_color = cloneObj(fill_prev);
      } else if (this.value === 'random') {
        make_random_color(layer_name, type_symbol);
      }
    });
    setSelected(fill_method.node(), Object.getOwnPropertyNames(fill_prev)[0]);
  }

  const fill_opct_section = popup.append('p').attr('class', 'line_elem');
  fill_opct_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));

  fill_opct_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      selection.style('fill-opacity', this.value);
      fill_opct_section.select('#fill_opacity_txt')
        .html(`${+this.value * 100}%`);
    });

  fill_opct_section.append('span')
    .attr('id', 'fill_opacity_txt')
    .style('float', 'right')
    .html(`${+opacity * 100}%`);

  const border_color_section = popup.append('p').attr('class', 'line_elem');
  border_color_section.append('span').html(i18next.t('app_page.layer_style_popup.border_color'));
  border_color_section.insert('input')
    .attrs({ type: 'color', value: stroke_prev })
    .style('float', 'right')
    .on('change', function () {
      selection.transition().style('stroke', this.value);
    });

  const border_opacity_section = popup.append('p');
  border_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.border_opacity'));

  border_opacity_section.insert('input')
    .attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity })
    .styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' })
    .on('change', function () {
      selection.style('stroke-opacity', this.value);
      border_opacity_section.select('#border_opacity_txt')
        .html(`${+this.value * 100}%`);
    });

  border_opacity_section.append('span')
    .attr('id', 'border_opacity_txt')
    .style('float', 'right')
    .html(`${+border_opacity * 100}%`);

  const border_width_section = popup.append('p').attr('class', 'line_elem');
  border_width_section.append('span').html(i18next.t('app_page.layer_style_popup.border_width'));
  border_width_section.insert('input')
    .attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width })
    .styles({ width: '60px', float: 'right' })
    .on('change', function () {
      selection.style('stroke-width', `${this.value}px`);
      current_layers[layer_name]['stroke-width-const'] = +this.value;
    });

  const prop_val_content = popup.append('p');
  prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.field_symbol_size', { field: field_used }));
  prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.symbol_fixed_size'));
  prop_val_content.insert('input')
    .styles({ width: '60px', float: 'right' })
    .attrs({ type: 'number', id: 'max_size_range', min: 0.1, step: 'any', value: current_layers[layer_name].size[1] })
    .on('change', function () {
      const f_size = +this.value;
      const prop_values = prop_sizer3_e(
        d_values, current_layers[layer_name].size[0], f_size, type_symbol);
      current_layers[layer_name].size[1] = f_size;
      redraw_prop_val(prop_values);
    });
  prop_val_content.append('span')
    .style('float', 'right')
    .html('(px)');

  const prop_val_content2 = popup.append('p').attr('class', 'line_elem');
  prop_val_content2.append('span').html(i18next.t('app_page.layer_style_popup.on_value'));
  prop_val_content2.insert('input')
    .styles({ width: '100px', float: 'right' })
    .attrs({ type: 'number', min: 0.1, step: 0.1, value: +current_layers[layer_name].size[0] })
    .on('change', function () {
      const f_val = +this.value;
      const prop_values = prop_sizer3_e(
        d_values, f_val, current_layers[layer_name].size[1], type_symbol);
      redraw_prop_val(prop_values);
      current_layers[layer_name].size[0] = f_val;
    });

  const allow_move_section = popup.append('p');
  const chkbx = allow_move_section.insert('input')
    .style('margin', '0')
    .attrs({
      type: 'checkbox',
      id: 'checkbox_move_symbol',
      checked: current_layers[layer_name].draggable ? true : null });
  allow_move_section.insert('label')
    .attr('for', 'checkbox_move_symbol')
    .html(i18next.t('app_page.layer_style_popup.let_draggable'));
  chkbx.on('change', function () {
    if (this.checked) {
      current_layers[layer_name].draggable = true;
    } else {
      current_layers[layer_name].draggable = false;
    }
  });

  popup.append('p').style('text-align', 'center')
    .insert('button')
    .attrs({ id: 'reset_symb_loc', class: 'button_st4' })
    .text(i18next.t('app_page.layer_style_popup.reset_symbols_location'))
    .on('click', () => {
      selection.transition()
        .attrs((d) => {
          const centroid = path.centroid(d.geometry);
          if (type_symbol === 'circle') {
            return {
              cx: centroid[0],
              cy: centroid[1],
            };
          } else {
            return {
              x: centroid[0] - +d.properties.prop_value / 2,
              y: centroid[1] - +d.properties.prop_value / 2,
            };
          }
        });
    });
  make_generate_labels_section(popup, layer_name);
}

/**
* Function triggered when the user want to edit a single label.
*
* @param {Node} label_node - The HTMLElement corresponding to this label.
* @return {void}
*
*/
function make_style_box_indiv_label(label_node) {
  const current_options = {
    size: label_node.style.fontSize,
    content: label_node.textContent,
    font: label_node.style.fontFamily,
    color: label_node.style.fill,
  };
  const new_params = {};
  if (current_options.color.startsWith('rgb')) {
    current_options.color = rgb2hex(current_options.color);
  }
  check_remove_existing_box('.styleTextAnnotation');
  make_confirm_dialog2('styleTextAnnotation', i18next.t('app_page.func_options.label.title_box_indiv'), { widthFitContent: true, draggable: true })
    .then((confirmed) => {
      if (!confirmed) {
        label_node.style.fontsize = current_options.size; // eslint-disable-line no-param-reassign
        label_node.textContent = current_options.content; // eslint-disable-line no-param-reassign
        label_node.style.fill = current_options.color; // eslint-disable-line no-param-reassign
        label_node.style.fontFamily = current_options.font; // eslint-disable-line no-param-reassign
      }
    });
  const box_content = d3.select('.styleTextAnnotation')
    .select('.modal-content')
    .style('width', '300px')
    .select('.modal-body')
    .insert('div');
  const a = box_content.append('p').attr('class', 'line_elem');
  a.insert('span').html(i18next.t('app_page.func_options.label.font_size'));
  a.append('input')
    .attrs({ type: 'number', id: 'font_size', min: 0, max: 34, step: 'any', value: +label_node.style.fontSize.slice(0, -2) })
    .styles({ width: '70px', float: 'right' })
    .on('change', function () {
      label_node.style.fontSize = `${this.value}px`; // eslint-disable-line no-param-reassign
    });
  const b = box_content.append('p').attr('class', 'line_elem');
  b.insert('span').html(i18next.t('app_page.func_options.label.content'));
  b.append('input').attrs({ value: label_node.textContent, id: 'label_content' })
    .styles({ width: '70px', float: 'right' })
    .on('keyup', function () {
      label_node.textContent = this.value; // eslint-disable-line no-param-reassign
    });
  const c = box_content.append('p').attr('class', 'line_elem');
  c.insert('span').html(i18next.t('app_page.func_options.common.color'));
  c.append('input').attrs({ type: 'color', value: rgb2hex(label_node.style.fill), id: 'label_color' })
    .styles({ width: '70px', float: 'right' })
    .on('change', function () {
      label_node.style.fill = this.value; // eslint-disable-line no-param-reassign
    });
  const d = box_content.append('p').attr('class', 'line_elem');
  d.insert('span').html(i18next.t('app_page.func_options.label.font_type'));
  const selec_fonts = d.append('select')
    .style('float', 'right')
    .on('change', function () {
      label_node.style.fontFamily = this.value; // eslint-disable-line no-param-reassign
    });

  available_fonts.forEach((name) => {
    selec_fonts.append('option').attr('value', name[1]).text(name[0]);
  });
  selec_fonts.node().value = label_node.style.fontFamily;
}

/**
* Function creating a drop shadow on a layer.
* Currently the properties (offset, gaussianBlur) of this shadow are hard-coded.
*
* @param {String} layerId - The id of the layer (ie. the "id" attribute, not the layer name)
* @return {void}
*
*/
const createDropShadow = function createDropShadow(layerId) {
  const filt_to_use = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filt_to_use.setAttribute('id', `filt_${layerId}`);
  // filt_to_use.setAttribute("x", 0);
  // filt_to_use.setAttribute("y", 0);
  filt_to_use.setAttribute('width', '200%');
  filt_to_use.setAttribute('height', '200%');
  const offset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
  offset.setAttributeNS(null, 'result', 'offOut');
  offset.setAttributeNS(null, 'in', 'SourceAlpha');
  offset.setAttributeNS(null, 'dx', '5');
  offset.setAttributeNS(null, 'dy', '5');
  const gaussian_blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  gaussian_blur.setAttributeNS(null, 'result', 'blurOut');
  gaussian_blur.setAttributeNS(null, 'in', 'offOut');
  gaussian_blur.setAttributeNS(null, 'stdDeviation', 10);
  const blend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
  blend.setAttributeNS(null, 'in', 'SourceGraphic');
  blend.setAttributeNS(null, 'in2', 'blurOut');
  blend.setAttributeNS(null, 'mode', 'normal');
  filt_to_use.appendChild(offset);
  filt_to_use.appendChild(gaussian_blur);
  filt_to_use.appendChild(blend);
  defs.node().appendChild(filt_to_use);
  svg_map.querySelector(`#${layerId}`).setAttribute('filter', `url(#filt_${layerId})`);
};

/**
* Return the id of a gaussian blur filter with the desired size (stdDeviation attribute)
* if one with the same param already exists, its id is returned,
* otherwise a new one is created, and its id is returned
*/
// var getBlurFilter = (function(size){
//   var count = 0;
//   return function(size) {
//     let blur_filts = defs.node().getElementsByClassName("blur");
//     let blur_filt_to_use;
//     for(let i=0; i < blur_filts.length; i++){
//       if(blur_filts[i].querySelector("feGaussianBlur")
//                      .getAttributeNS(null, "stdDeviation") === size){
//         blur_filt_to_use = blur_filts[i];
//       }
//     }
//     if(!blur_filt_to_use){
//       count = count + 1;
//       blur_filt_to_use = document.createElementNS(
//         "http://www.w3.org/2000/svg", "filter");
//       blur_filt_to_use.setAttribute("id","blurfilt" + count);
//       blur_filt_to_use.setAttribute("class", "blur");
//       var gaussianFilter = document.createElementNS(
//         "http://www.w3.org/2000/svg", "feGaussianBlur");
//       gaussianFilter.setAttributeNS(null, "in", "SourceGraphic");
//       gaussianFilter.setAttributeNS(null, "stdDeviation", size);
//       blur_filt_to_use.appendChild(gaussianFilter);
//       defs.node().appendChild(blur_filt_to_use);
//     }
//     return blur_filt_to_use.id;
//   };
// })();
