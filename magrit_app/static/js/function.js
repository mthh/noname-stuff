'use strict';

const get_menu_option = (function () {
  const menu_option = {
    'smooth':{
      'name': 'smooth',
      'menu_factory': 'fillMenu_Stewart',
      'fields_handler': 'fields_Stewart',
    },
    'prop':{
      'name': 'prop',
      'menu_factory': 'fillMenu_PropSymbol',
      'fields_handler': 'fields_PropSymbol',
    },
    'choroprop':{
      'name': 'choroprop',
      'menu_factory': 'fillMenu_PropSymbolChoro',
      'fields_handler': 'fields_PropSymbolChoro',
    },
    'proptypo':{
      'name': 'proptypo',
      'menu_factory': 'fillMenu_PropSymbolTypo',
      'fields_handler': 'fields_PropSymbolTypo',
    },
    'choro':{
      'name': 'choro',
      'menu_factory': 'fillMenu_Choropleth',
      'fields_handler': 'fields_Choropleth',
    },
    'cartogram':{
      'name': 'cartogram',
      'menu_factory': 'fillMenu_Anamorphose',
      'fields_handler': 'fields_Anamorphose',
    },
    'grid':{
      'name': 'grid',
      'menu_factory': 'fillMenu_griddedMap',
      'fields_handler': 'fields_griddedMap',
    },
    'flow':{
      'name': 'flow',
      'menu_factory': 'fillMenu_FlowMap',
      'fields_handler': 'fields_FlowMap',
    },
    'discont':{
      'name': 'discont',
      'menu_factory': 'fillMenu_Discont',
      'fields_handler': 'fields_Discont',
    },
    'typo':{
      'name': 'typo',
      'menu_factory': 'fillMenu_Typo',
      'fields_handler': 'fields_Typo',
    },
    'typosymbol':{
      'name': 'typosymbol',
      'menu_factory': 'fillMenu_TypoSymbol',
      'fields_handler': 'fields_TypoSymbol',
    }
  };
  return (func) => menu_option[func.toLowerCase()] || {};
})();

/**
* Remove the div on which we are displaying the options related to each
* kind of rendering.
*
*/
function clean_menu_function() {
  if (fields_handler && fields_handler.unfill) {
    fields_handler.unfill();
    fields_handler = undefined;
  }
  if (_app.current_functionnality && _app.current_functionnality.name) {
    let previous_button = document.getElementById('button_' + _app.current_functionnality.name);
    if (previous_button.style.filter !== 'grayscale(100%)')
      previous_button.style.filter = 'invert(0%) saturate(100%)';
    previous_button.classList.remove('active');
    _app.current_functionnality = undefined;
  }
  section2.select('.form-rendering').remove();
  document.getElementById('accordion2b').style.display = 'none';
  let btn_s2b = document.getElementById('btn_s2b');
  btn_s2b.innerHTML = i18next.t('app_page.section2_.title_no_choice');
  btn_s2b.setAttribute('data-i18n', 'app_page.section2_.title_no_choice');
  btn_s2b.style.display = 'none';
}

/**
*  Reset the user choosen values remembered for its ease
*  (like discretization choice, symbols, etc. which are redisplayed as they
*   were selected by the user)
*
*/
function reset_user_values() {
  fields_TypoSymbol.box_typo = undefined;
  fields_TypoSymbol.rendering_params = {};
  fields_TypoSymbol.cats = {};
  fields_PropSymbolChoro.rendering_params = {};
  fields_Typo.rendering_params = {};
  fields_Choropleth.rendering_params = {};
  fields_PropSymbolTypo.rendering_params = {};
}
/**
* Function to remove each node (each <option>) of a <select> HTML element :
*
*/
function unfillSelectInput(select_node) {
  for(let i = select_node.childElementCount - 1; i > -1; i--)
      select_node.removeChild(select_node.children[i]);
}


/** Function trying to avoid layer name collision by adding a suffix
* to the layer name if already exists and incrementing it if necessary
* (MyLayer -> MyLayer_1 -> MyLayer_2 etc.)
*
* @param {string} name - The original wanted name of the layer to add
* @return {string} new_name - An available name to safely add the layer
*     (the input name if possible or a slightly modified
*        one to avoid collision or unwanted characters)
*/
function check_layer_name(name) {
  let clean_name = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (clean_name.match(/^\d+/)) {
    clean_name = '_' + clean_name;
  }
  if (!current_layers.hasOwnProperty(clean_name) && ['Graticule', 'World'].indexOf(clean_name) < 0) {
    return clean_name;
  } else {
    let i = 1;
    let match = clean_name.match(/_\d+$/);
    if (match) {
      i = match[0];
      clean_name = clean_name.substring(clean_name, clean_name.indexOf(i));
      return check_layer_name([clean_name, parseInt(i.slice(1, i.length)) + 1].join('_'));
    } else {
      return check_layer_name([clean_name, i].join('_'));
    }
  }
}

/**
* Display a message when switching between functionnalitiesif the layer to render
* doesn't have any interesting field to use.
*/
function display_error_num_field() {
  swal({
    title: '',
    text: i18next.t('app_page.common.error_type_fields'),
    type: 'error'
  });
};

/**
* Return an approximate value (based on the bbox of the targeted layer)
* to fill the "span" field in stewart functionnality
* as well as the "resolution" field in grid functionnality.
*
* @param {String} func_name - the name of the representation for which this function
*                             is called (between 'grid' and 'stewart').
* @return Number - A first guess for the span value (with no decimal if possible)
*/
const get_first_guess_span = function(func_name) {
  const bbox = _target_layer_file.bbox,
    layer_name = Object.getOwnPropertyNames(_target_layer_file.objects),
    abs = Math.abs,
    const_mult = func_name === 'grid' ? 0.09 : 0.05;
  const width_km = haversine_dist(
    [bbox[0], abs(bbox[3]) - abs(bbox[1])], [bbox[2], abs(bbox[3]) - abs(bbox[1])]);
  const height_km = haversine_dist(
    [abs(bbox[2]) - abs(bbox[0]), bbox[1]], [abs(bbox[2]) - abs(bbox[0]), bbox[3]]);
  const val = Math.max(width_km , height_km) * const_mult;
  return val > 10 ? Math.round(val / 10) * 10 : Math.round(val);
}

/**
* Check if the wanted resolution isn't too big before sending the request
* to the server.
*
* @param {Number} cell_value - The cell value to test
* @return
*/
function test_maxmin_resolution(cell_value) {
  const bbox = _target_layer_file.bbox;
  const abs = Math.abs;
  const width_km = haversine_dist(
    [bbox[0], abs(bbox[3]) - abs(bbox[1])], [bbox[2], abs(bbox[3]) - abs(bbox[1])]);
  const height_km = haversine_dist(
    [abs(bbox[2]) - abs(bbox[0]), bbox[1]], [abs(bbox[2]) - abs(bbox[0]), bbox[3]]);
  // const area = width_km * height_km;
  const bigger_side = Math.max(height_km, width_km);
  if ((width_km * height_km) / (cell_value * cell_value) > 15000) {
    return 'higher';
  } else if (cell_value > bigger_side / 1.66) {
    return 'lower';
  }
  return;
}

/*
* Set the appropriate discretisation icon as selected
*
*/
var color_disc_icons = (function () {
  let types = new Set(['q6', 'equal_interval', 'jenks', 'quantiles']);
  return function(type_disc) {
    if (!type_disc) return ;
    type_disc = type_disc.toLowerCase();
    if (!types.has(type_disc)) {
      return;
    } else {
      document.getElementById('ico_' + type_disc).style.border = 'solid 1px green';
    }
  }
})();

function make_template_functionnality(parent_node) {
  return parent_node.append('div').attr('class', 'form-rendering');
}


/**
* Make the input element allowing to choose the resulting layer name
* (used for each representation type)
* @param {Object} parent - The parent of the element to be created.
* @param {String} id - the id of the element to be created.
* @param {String} margin_top - The margin on the top of the input element (in px).
* @return void
*/
function make_layer_name_button(parent, id, margin_top) {
  let a = parent.append('p').style('clear', 'both');
  a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.output' })
    .html(i18next.t('app_page.func_options.common.output'));
  a.insert('input')
    .styles({ width: '240px', 'font-size': '11.5px', 'margin-top': margin_top })
    .attrs({ class: 'params', id: id });
}

function make_discretization_icons(discr_section) {
  let subsection1 = discr_section.append('p');
  subsection1.insert('span')
    .attrs({ 'data-i18n': '[html]app_page.func_options.common.discretization_choice', class: 'i18n' })
    .html(i18next.t('app_page.func_options.common.discretization_choice'));
  let subsection2 = discr_section.append('p');
  subsection2.append('img')
    .styles({ margin: '0 7.5px', cursor: 'pointer' })
    .attrs({ src: '/static/img/discr_icons/q6.png', id: 'ico_q6' });
  subsection2.append('img')
    .styles({ margin: '0 7.5px', cursor: 'pointer' })
    .attrs({ src: '/static/img/discr_icons/jenks.png', id: 'ico_jenks' });
  subsection2.append('img')
    .styles({ margin: '0 7.5px', cursor: 'pointer' })
    .attrs({ src: '/static/img/discr_icons/equal_intervals.png', id: 'ico_equal_interval' });
  subsection2.append('img')
    .styles({ margin: '0 7.5px', cursor: 'pointer' })
    .attrs({ src: '/static/img/discr_icons/quantiles.png', 'id': 'ico_quantiles' });
  subsection2.append('img')
    .styles({ margin: '0 7.5px', cursor: 'pointer' })
    .attrs({ src: '/static/img/discr_icons/others.png', id: 'ico_others' });
  subsection2.append('span')
    .attrs({ id: 'choro_mini_choice_disc' })
    .styles({ float: 'right', 'margin-top': '5px', 'margin-left': '15px' });
  subsection2.append('img')
    .styles({ width: '15px', position: 'absolute', right: '5px' })
    .attrs({ id: 'img_choice_disc', src: '/static/img/Red_x.png' });
}


function make_ok_button(parent, id, disabled=true) {
  let a = parent.append('p')
    .styles({ 'text-align': 'right', margin: 'auto' });
  a.append('button')
    .attrs({ 'id': id, 'class': 'params button_st3 i18n',
      'data-i18n': '[html]app_page.func_options.common.render',
      'disabled': disabled ? true : null })
    .html(i18next.t('app_page.func_options.common.render'));
}

function make_min_max_tableau(values, nb_class, discontinuity_type, min_size, max_size, id_parent, breaks, callback) {
  document.getElementById(id_parent).innerHTML = '';
  if (values && breaks == undefined) {
    let disc_result = discretize_to_size(values, discontinuity_type, nb_class, min_size, max_size);
    breaks = disc_result[2];
    if (!breaks) return false;
  }

  let parent_nd = document.getElementById(id_parent);
  parent_nd.style.marginTop = '3px';
  parent_nd.style.marginBottom = '3px';
  // parent_nd.style = "margin-top: 3px; margin-bottom: 3px;"

  let title = document.createElement('p');
  // title.style = "margin: 1px; word-spacing: 1.8em;";
  title.style.margin = '1px';
  title.style.wordSpacing = '1.8em';
  title.innerHTML = 'Min - Max - Size';
  parent_nd.appendChild(title);

  let div_table = document.createElement('div');
  parent_nd.appendChild(div_table);
  for (let i = 0; i < breaks.length; i++) {
    let inner_line = document.createElement('p');
    inner_line.setAttribute('class', 'breaks_vals');
    inner_line.id = ['line', i].join('_');
    inner_line.style.margin = '0px';

    let input1 = document.createElement('input');
    input1.setAttribute('type', 'number');
    input1.setAttribute('class', 'min_class');
    input1.setAttribute('step', 'any');
    input1.value = (+breaks[i][0][0]).toFixed(2);
    input1.style.width = '60px';
    input1.style.position = 'unset';
    inner_line.appendChild(input1);

    let input2 = document.createElement('input');
    input2.setAttribute('type', 'number');
    input2.setAttribute('class', 'max_class');
    input2.setAttribute('step', 'any');
    input2.value = (+breaks[i][0][1]).toFixed(2);
    input2.style.width = '60px';
    input2.style.position = 'unset';
    inner_line.appendChild(input2);

    let input3 = document.createElement('input');
    input3.setAttribute('type', 'number');
    input3.setAttribute('class', 'size_class');
    input3.setAttribute('step', 'any');
    input3.value = (+breaks[i][1]).toFixed(2);
    input3.style.marginLeft = '20px';
    input3.style.width = '55px';
    input3.style.position = 'unset';
    inner_line.appendChild(input3);

    let px = document.createElement('span');
    px.innerHTML = ' px';
    inner_line.appendChild(px);
    div_table.appendChild(inner_line);
  }

  const mins = document.getElementById(id_parent).querySelectorAll('.min_class'),
    maxs = document.getElementById(id_parent).querySelectorAll('.max_class');

  for (let i = 0; i < mins.length; i++) {
    if (i > 0) {
      const prev_ix = i - 1;
      mins[i].onchange = function () {
        maxs[prev_ix].value = this.value;
        if (callback) callback();
      };
    }
    if (i < mins.length - 1) {
      const next_ix = i + 1;
      maxs[i].onchange = function () {
        mins[next_ix].value = this.value;
        if (callback) callback();
      };
    }
  }
  if (callback) {
    const sizes = document.getElementById(id_parent).querySelectorAll('.size_class')
    for (let i = 0; i < sizes.length; i++) {
      sizes[i].onchange = callback;
    }
  }
}

function fetch_min_max_table_value(parent_id) {
  const parent_node = parent_id ? document.getElementById(parent_id)
    : _app.current_functionnality.name === 'flow' ? document.getElementById('FlowMap_discTable')
    : _app.current_functionnality.name === 'discont' ? document.getElementById('Discont_discTable')
    : null;

  if (!parent_node) return;

  const mins = Array.prototype.map.call(parent_node.querySelectorAll('.min_class'), el => +el.value),
    maxs = Array.prototype.map.call(parent_node.querySelectorAll('.max_class'), el => +el.value),
    sizes = Array.prototype.map.call(parent_node.querySelectorAll('.size_class'), el => +el.value),
    nb_class = mins.length,
    comp_fun = (a,b) => a - b;

// Some verification regarding the input values provided by the user :
// - Values are ordered :
  if (mins !== mins.sort(comp_fun) || maxs !== maxs.sort(comp_fun) || sizes !== sizes.sort(comp_fun)) {
    swal('', i18next.t('app_page.common.error_values_order'), 'error');
    return false;
  }

  return { mins: mins.sort(comp_fun), maxs: maxs.sort(comp_fun), sizes: sizes.sort(comp_fun) };
}

function fillMenu_PropSymbolChoro(layer) {
  const dv2 = make_template_functionnality(section2);

  const a = dv2.append('p').attr('class', 'params_section2');
  a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.field1' })
    .html(i18next.t('app_page.func_options.choroprop.field1'));
  const field1_selec = a.insert('select')
    .attrs({ class: 'params', id: 'PropSymbolChoro_field_1' });

  const b = dv2.append('p').attr('class', 'params_section2');
  b.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.fixed_size' })
    .html(i18next.t('app_page.func_options.choroprop.fixed_size'));
  const ref_size = b.insert('input')
    .attrs({
      id: 'PropSymbolChoro_ref_size',
      type: 'number',
      class: 'params',
      min: 0.1,
      max: 100.0,
      value: 60.0,
      step: 'any' })
    .style('width', '50px');
  b.append('span').html(' (px)');

  const c = dv2.append('p').attr('class', 'params_section2');
  c.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.on_value' })
    .html(i18next.t('app_page.func_options.choroprop.on_value'));
  const ref_value = c.insert('input')
    .styles({ width: '100px', 'margin-left': '10px' })
    .attrs({ type: 'number', class: 'params', id: 'PropSymbolChoro_ref_value' })
    .attrs({ min: 0.1, step: 0.1 });

  // Other symbols could probably easily be proposed :
  const d = dv2.append('p').attr('class', 'params_section2');
  d.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.symbol_type' })
    .html(i18next.t('app_page.func_options.choroprop.symbol_type'));
  const symb_selec = d.insert('select')
    .attrs({ class: 'params i18n', id: 'PropSymbolChoro_symbol_type' });

  const e = dv2.append('p').attr('class', 'params_section2');
  e.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.field2' })
    .html(i18next.t('app_page.func_options.choroprop.field2'));

  const field2_selec = e.insert('select')
    .attrs({ class: 'params', id: 'PropSymbolChoro_field_2' });

  let discr_section = dv2.insert('p').style('margin', 'auto');
  discr_section.insert('span')
    .attr('id', 'container_sparkline_propsymbolchoro')
    .styles({ margin: '16px 50px 0px 4px', float: 'right' });
  make_discretization_icons(discr_section);
  // let f = dv2.insert('p').attr('class', 'params_section2');
  // f.append("button")
  //     .attrs({id: 'PropSymbolChoro_btn_disc', class: 'params button_disc i18n', 'data-i18n': '[html]app_page.func_options.common.discretization_choice'})
  //     .styles({"font-size": "0.8em", "text-align": "center"})
  //     .html(i18next.t("app_page.func_options.common.discretization_choice"));

  make_layer_name_button(dv2, 'PropSymbolChoro_output_name', '15px');
  make_ok_button(dv2, 'propChoro_yes');
  dv2.selectAll('.params').attr('disabled', true);
}

const fields_PropSymbolChoro = {
  fill(layer) {
    if (!layer) return;
    section2.selectAll('.params').attr('disabled', null);
    let self = this,
      fields_stock = getFieldsType('stock', layer),
      fields_ratio = getFieldsType('ratio', layer),
      nb_features = user_data[layer].length,
      field_size = section2.select('#PropSymbolChoro_field_1'),
      field_color = section2.select('#PropSymbolChoro_field_2'),
      ico_disc = section2.select('#ico_others'),
      ico_jenks = section2.select('#ico_jenks'),
      ico_quantiles = section2.select('#ico_quantiles'),
      ico_equal_interval = section2.select('#ico_equal_interval'),
      ico_q6 = section2.select('#ico_q6'),
      uo_layer_name = section2.select('#PropSymbolChoro_output_name'),
      ref_value_field = section2.select('#PropSymbolChoro_ref_value'),
      symb_selec = section2.select('#PropSymbolChoro_symbol_type'),
      ref_size = section2.select('#PropSymbolChoro_ref_size'),
      choro_mini_choice_disc = section2.select('#choro_mini_choice_disc'),
      img_valid_disc = section2.select('#img_choice_disc'),
      ok_button = section2.select('#propChoro_yes');

    const uncolor_icons = () => {
      ico_jenks.style('border', null);
      ico_q6.style('border', null);
      ico_quantiles.style('border', null);
      ico_equal_interval.style('border', null);
    };

    if (current_layers[layer].type === 'Line') {
      ref_size.attr('value', 10.0);
      [['app_page.func_options.common.symbol_line', 'line'],
       ['app_page.func_options.common.symbol_circle', 'circle'],
       ['app_page.func_options.common.symbol_square', 'rect']
      ].forEach((symb) => {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    } else {
      ref_size.attr('value', 60.0);
      [['app_page.func_options.common.symbol_circle', 'circle'],
       ['app_page.func_options.common.symbol_square', 'rect']
      ].forEach((symb) => {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    }

    const prepare_disc_quantiles = (field) => {
      const _values = user_data[layer].map(v => v[field]);
      const n_class = getOptNbClass(_values.length);
      render_mini_chart_serie(_values.map(v => +v), document.getElementById('container_sparkline_propsymbolchoro'));
      const [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'quantiles', n_class);
      self.rendering_params[field] = {
        nb_class: nb_class, type: 'quantiles', colors: color_array,
        breaks: breaks, no_data: no_data_color,
        colorsByFeature: colors_map, renderer: 'Choropleth',
        rendered_field: field, schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
      uncolor_icons();
      ico_quantiles.style('border', 'solid 1px green');
    };

    if (fields_stock.length === 0 || fields_ratio.length === 0) {
      display_error_num_field();
      return;
    }

    // Set some default colors in order to not force to open the box for selecting them :
    {
      let first_field = fields_ratio[0];
      prepare_disc_quantiles(first_field);
      ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
    }

    fields_stock.forEach(function(field) {
      field_size.append('option').text(field).attr('value', field);
    });
    fields_ratio.forEach(field => {
      field_color.append('option').text(field).attr('value', field);
    });
    field_size.on('change', function () {
      let field_name = this.value,
        max_val_field = max_fast(user_data[layer].map(obj => +obj[field_name]));

      ref_value_field.attrs({ max: max_val_field, value: max_val_field });
      uo_layer_name.attr('value', ['PropSymbols', field_name, field_color.node().value, layer].join('_'));
    });

    field_color.on('change', function () {
      let field_name = this.value,
          vals = user_data[layer].map(a => +a[field_name]);
      render_mini_chart_serie(vals, document.getElementById('container_sparkline_propsymbolchoro'));
      uo_layer_name.attr('value', ['PropSymbols', field_size.node().value, field_name, layer].join('_'));
      if (self.rendering_params[field_name] !== undefined) {
        // ok_button.attr('disabled', null);
        img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        choro_mini_choice_disc.html(
            i18next.t('app_page.common.' + self.rendering_params[field_name].type) + ', ' + i18next.t('app_page.common.class', {count: self.rendering_params[field_name].nb_class}));
        uncolor_icons();
        color_disc_icons(self.rendering_params[field_name].type);
        // console.log(section2); console.log(self.rendering_params[field_name].type);
      } else {
        prepare_disc_quantiles(field_name);
        // ok_button.attr('disabled', true);
        // img_valid_disc.attr('src', '/static/img/Red_x.png');
        // choro_mini_choice_disc.html('');
      }
    });

    ico_jenks.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      const selected_field = field_color.node().value,
        _values = user_data[layer].map(v => v[selected_field]),
        n_class = getOptNbClass(_values.length);
      const [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'jenks', n_class, 'BuGn');
      self.rendering_params[selected_field] = {
        nb_class: nb_class, type: 'jenks', colors: color_array,
        breaks: breaks, no_data: no_data_color,
        colorsByFeature: colors_map, renderer: 'PropSymbolsChoro',
        rendered_field: selected_field, schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.jenks') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_quantiles.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      const selected_field = field_color.node().value,
        _values = user_data[layer].map(v => v[selected_field]),
        n_class = getOptNbClass(_values.length);
      const [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'quantiles', n_class, 'BuGn');
      self.rendering_params[selected_field] = {
        nb_class: nb_class, type: 'quantiles', colors: color_array,
        breaks: breaks, no_data: no_data_color,
        colorsByFeature: colors_map, renderer: 'PropSymbolsChoro',
        rendered_field: selected_field, schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_equal_interval.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      let selected_field = field_color.node().value,
        _values = user_data[layer].map(v => v[selected_field]),
        n_class = getOptNbClass(_values.length);
      let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'equal_interval', n_class, 'BuGn');
      self.rendering_params[selected_field] = {
        nb_class: nb_class, type: 'equal_interval', colors: color_array,
        breaks: breaks, no_data: no_data_color,
        colorsByFeature: colors_map, renderer: 'PropSymbolsChoro',
        rendered_field: selected_field, schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.equal_interval') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_q6.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      let selected_field = field_color.node().value,
        _values = user_data[layer].map(v => v[selected_field]);
      let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'Q6', 6, 'BuGn');
      self.rendering_params[selected_field] = {
        nb_class: nb_class, type: 'Q6', colors: color_array,
        breaks: breaks, no_data: no_data_color,
        colorsByFeature: colors_map, renderer: 'PropSymbolsChoro',
        rendered_field: selected_field, schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.Q6') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_disc.on('click', function () {
      let selected_field = field_color.node().value,
          opt_nb_class = Math.floor(1 + 3.3 * Math.log10(user_data[layer].length)),
          conf_disc_box;

      if (self.rendering_params[selected_field])
        conf_disc_box = display_discretization(layer,
                                               selected_field,
                                               self.rendering_params[selected_field].nb_class,
                                               {schema: self.rendering_params[selected_field].schema,
                                                colors: self.rendering_params[selected_field].colors,
                                                no_data: self.rendering_params[selected_field].no_data,
                                                type: self.rendering_params[selected_field].type,
                                                breaks: self.rendering_params[selected_field].breaks,
                                                extra_options: self.rendering_params[selected_field].extra_options});
      else
        conf_disc_box = display_discretization(layer, selected_field, opt_nb_class, { type: 'quantiles' });

      conf_disc_box.then((confirmed) => {
        if (confirmed) {
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
            choro_mini_choice_disc.html(
                i18next.t('app_page.common.' + confirmed[1]) + ', ' + i18next.t('app_page.common.class', {count: confirmed[0]}));
            uncolor_icons();
            color_disc_icons(confirmed[1]);
            self.rendering_params[selected_field] = {
              nb_class: confirmed[0],
              type: confirmed[1],
              schema: confirmed[5],
              no_data: confirmed[6],
              breaks: confirmed[2],
              colors: confirmed[3],
              colorsByFeature: confirmed[4],
              renderer: 'PropSymbolsChoro',
              extra_options: confirmed[7]
            };
        } else
            return;
      });
    });
    ok_button.on('click', function () {
      if (!ref_value_field.node().value) return;
      let rendering_params = self.rendering_params;
      if (rendering_params[field_color.node().value]) {
        let layer = Object.getOwnPropertyNames(user_data)[0],
            symbol_to_use = symb_selec.node().value,
            nb_features = user_data[layer].length,
            rd_params = {},
            color_field = field_color.node().value,
            new_layer_name = uo_layer_name.node().value;

        new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : layer + '_PropSymbolsChoro');

        rd_params.field = field_size.node().value;
        rd_params.new_name = new_layer_name;
        rd_params.nb_features = nb_features;
        rd_params.ref_layer_name = layer;
        rd_params.symbol = symbol_to_use;
        rd_params.ref_value = +ref_value_field.node().value;
        rd_params.ref_size = +ref_size.node().value;
        rd_params.fill_color = rendering_params[color_field]['colorsByFeature'];
        rd_params.color_field = color_field;

        if (symbol_to_use === 'line') {
          make_prop_line(rd_params);
        } else {
          make_prop_symbols(rd_params);
        }
        let colors_breaks = [];
        for(let i = rendering_params[color_field]['breaks'].length-1; i > 0; --i) {
            colors_breaks.push([
                    [rendering_params[color_field]['breaks'][i-1], ' - ', rendering_params[color_field]['breaks'][i]].join(''),
                    rendering_params[color_field]['colors'][i-1]
                ]);
        }

        let options_disc = {
          schema: rendering_params[color_field].schema,
          colors: rendering_params[color_field].colors,
          no_data: rendering_params[color_field].no_data,
          type: rendering_params[color_field].type,
          breaks: rendering_params[color_field].breaks,
          extra_options: rendering_params[color_field].extra_options
        };

        Object.assign(current_layers[new_layer_name],{
          renderer: 'PropSymbolsChoro',
          options_disc: options_disc,
          rendered_field: field_size.node().value,
          rendered_field2: field_color.node().value,
          colors_breaks: colors_breaks,
        });
        zoom_without_redraw();
        switch_accordion_section();
        handle_legend(new_layer_name);
      }
    });
    setSelected(field_size.node(), fields_stock[0]);
    setSelected(field_color.node(), fields_ratio[0]);
  },

  unfill: function() {
    unfillSelectInput(document.getElementById('PropSymbolChoro_field_1'));
    unfillSelectInput(document.getElementById('PropSymbolChoro_field_2'));
    unfillSelectInput(document.getElementById('PropSymbolChoro_symbol_type'));
    section2.selectAll('.params').attr('disabled', true);
  },

  rendering_params: {}
};

var fillMenu_Typo = function () {
    var dv2 = make_template_functionnality(section2);

    let a = dv2.append('p').attr('class', 'params_section2');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.typo.field' })
      .html(i18next.t('app_page.func_options.typo.field'))
    a.insert('select')
      .attrs({ id: 'Typo_field_1', class: 'params' });

    let b = dv2.insert('p').styles({ margin: 'auto', 'text-align': 'center' });
    b.append('button')
      .attrs({ id: 'Typo_class', class: 'button_disc params i18n',
              'data-i18n': '[html]app_page.func_options.typo.color_choice' })
      .styles({ 'font-size': '0.8em', 'text-align': 'center' })
      .html(i18next.t('app_page.func_options.typo.color_choice'));

    make_layer_name_button(dv2, 'Typo_output_name');
    make_ok_button(dv2, 'Typo_yes');
    dv2.selectAll('.params').attr('disabled', true);
}

var fields_Typo = {
    fill: function(layer) {
        if (!layer) return;
        let self = this,
            g_lyr_name = '#' + layer,
            fields_name = getFieldsType('category', layer),
            field_selec = section2.select('#Typo_field_1'),
            ok_button = section2.select('#Typo_yes'),
            btn_typo_class = section2.select('#Typo_class'),
            uo_layer_name = section2.select('#Typo_output_name');

        let prepare_colors = (field) => {
            let [cats, col_map] = prepare_categories_array(layer, field, null);
            let nb_class = col_map.size;
            let colorByFeature = user_data[layer].map(ft => col_map.get(ft[field])[0]);
            self.rendering_params[field] = {
                nb_class: nb_class, color_map: col_map, colorByFeature: colorByFeature,
                renderer: 'Categorical', rendered_field: field, skip_alert: false
            };

        }

        fields_name.forEach(f_name => {
            field_selec.append('option').text(f_name).attr('value', f_name);
        });

        field_selec.on('change', function () {
          let selected_field = this.value;
          uo_layer_name.attr('value', ['Typo', selected_field, layer].join('_'));
          prepare_colors(selected_field);
        });

        // Set some default colors in order to not force to open the box for selecting them :
        {
            let first_field = fields_name[0];
            prepare_colors(first_field);
            ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
        }

        btn_typo_class.on('click', function () {
            let selected_field = field_selec.node().value,
                nb_features = current_layers[layer].n_features,
                col_map = self.rendering_params[selected_field] ? self.rendering_params[selected_field].color_map : undefined,
                cats;
            [cats, col_map] = prepare_categories_array(layer, selected_field, col_map);
            if (cats.length > 15) {
              swal({ title: '',
                text: i18next.t('app_page.common.error_too_many_features_color'),
                type: 'warning',
                showCancelButton: true,
                allowOutsideClick: false,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: i18next.t('app_page.common.valid') + '!',
                cancelButtonText: i18next.t('app_page.common.cancel')
              }).then(() => {
                display_categorical_box(user_data[layer], layer, selected_field, cats)
                  .then(function(confirmed) {
                    if (confirmed) {
                      self.rendering_params[selected_field] = {
                        nb_class: confirmed[0], color_map :confirmed[1], colorByFeature: confirmed[2],
                        renderer:'Categorical', rendered_field: selected_field, skip_alert: true
                      };
                    }
                  });
              }, dismiss => {
                return;
              });
            } else {
              display_categorical_box(user_data[layer], layer, selected_field, cats)
                .then(function(confirmed) {
                  if (confirmed) {
                    self.rendering_params[selected_field] = {
                      nb_class: confirmed[0], color_map :confirmed[1], colorByFeature: confirmed[2],
                      renderer:'Categorical', rendered_field: selected_field, skip_alert: true
                    };
                  }
                });
            }
        });

        ok_button.on('click', function () {
          let selected_field = field_selec.node().value;
          let render = () => {
              if (self.rendering_params[selected_field]) {
                  let layer = Object.getOwnPropertyNames(user_data)[0],
                      output_name = uo_layer_name.node().value;
                  self.rendering_params[selected_field].new_name = check_layer_name(output_name.length > 0 ? output_name : ['Typo', selected_field, layer].join('_'));
                  render_categorical(layer, self.rendering_params[selected_field]);
                  switch_accordion_section();
                  handle_legend(self.rendering_params[selected_field].new_name)
              }
          };
          if (self.rendering_params[selected_field].color_map.size > 15 && !self.rendering_params[selected_field].skip_alert) {
              swal({ title: '',
                text: i18next.t('app_page.common.error_too_many_features_color'),
                type: 'warning',
                showCancelButton: true,
                allowOutsideClick: false,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: i18next.t('app_page.common.valid') + '!',
                cancelButtonText: i18next.t('app_page.common.cancel')
              }).then(() => {
                render();
              }, dismiss => { return; });
          } else {
                render();
          }
        });
        uo_layer_name.attr('value', 'Typo_' + layer);
        section2.selectAll('.params').attr('disabled', null);
        setSelected(field_selec.node(), fields_name[0]);
    },
    unfill: function () {
        let field_selec = document.getElementById('Typo_field_1'),
            nb_fields = field_selec.childElementCount;

        for(let i = nb_fields - 1; i > -1 ; --i)
            field_selec.removeChild(field_selec.children[i]);

        section2.selectAll('.params').attr('disabled', true);
    },
    rendering_params: {}
};

function fillMenu_Choropleth() {
    let dv2 = make_template_functionnality(section2);

    var field_selec_section = dv2.append('p').attr('class', 'params_section2');
    field_selec_section.insert('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' })
      .html(i18next.t('app_page.func_options.common.field'));

   field_selec_section.insert('select')
    .attrs({ id: 'choro_field1', class: 'params' });

    let discr_section = dv2.insert('p').style('margin', 'auto');
    discr_section.insert('span')
      .attr('id', 'container_sparkline_choro')
      .styles({ margin: '16px 50px 0px 4px', float: 'right' });
    make_discretization_icons(discr_section);

    make_layer_name_button(dv2, 'Choro_output_name', '15px');
    make_ok_button(dv2, 'choro_yes');
    dv2.selectAll('.params').attr('disabled', true);
}

var fields_Choropleth = {
    fill: function(layer) {
        if (!layer) return;
        let self = this,
            g_lyr_name = '#'+layer,
            fields = getFieldsType('ratio', layer),
            // fields = type_col(layer, "number"),
            field_selec = section2.select('#choro_field1'),
            uo_layer_name = section2.select('#Choro_output_name'),
            ok_button = section2.select('#choro_yes'),
            img_valid_disc = section2.select('#img_choice_disc'),
            ico_jenks = section2.select('#ico_jenks'),
            ico_quantiles = section2.select('#ico_quantiles'),
            ico_q6 = section2.select('#ico_q6'),
            ico_equal_interval = section2.select('#ico_equal_interval'),
            btn_class = section2.select('#ico_others'),
            choro_mini_choice_disc = section2.select('#choro_mini_choice_disc');

        let uncolor_icons = () => {
            ico_jenks.style('border', null);
            ico_q6.style('border', null);
            ico_quantiles.style('border', null);
            ico_equal_interval.style('border', null);
        };

        let prepare_disc_quantiles = (field) => {
            let _values = user_data[layer].map(v => v[field]),
                n_class = getOptNbClass(_values.length);
            render_mini_chart_serie(_values.map(v => +v), document.getElementById('container_sparkline_choro'));
            let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'quantiles', n_class);
            self.rendering_params[field] = {
                nb_class: nb_class, type: 'quantiles', colors: color_array,
                breaks: breaks, no_data: no_data_color,
                colorsByFeature: colors_map, renderer: 'Choropleth',
                rendered_field: field, schema: ['Reds']
            };
            choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
            ok_button.attr('disabled', null);
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
            uncolor_icons();
            ico_quantiles.style('border', 'solid 1px green');
        }

        if (fields.length === 0) {
            display_error_num_field();
            return;
        }
        section2.selectAll('.params').attr('disabled', null);
        fields.forEach(field => {
            field_selec.append('option').text(field).attr('value', field);
        });

        // Set some default colors in order to not force to open the box for selecting them :
        {
            let first_field = fields[0];
            prepare_disc_quantiles(first_field);
            ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
        }

        field_selec.on('change', function () {
            let field_name = this.value,
                vals = user_data[layer].map(a => +a[field_name]);
            render_mini_chart_serie(vals, document.getElementById('container_sparkline_choro'));
            uo_layer_name.attr('value', ['Choro', field_name, layer].join('_'));
            if (self.rendering_params[field_name] !== undefined) {
                // ok_button.attr('disabled', null);
                img_valid_disc.attr('src', '/static/img/Light_green_check.png');
                choro_mini_choice_disc.html(
                    i18next.t('app_page.common.' + self.rendering_params[field_name].type) + ', ' + i18next.t('app_page.common.class', {count: self.rendering_params[field_name].nb_class}));
                uncolor_icons();
                color_disc_icons(self.rendering_params[field_name].type);
            } else {
                prepare_disc_quantiles(field_name);
            }
        });

        ico_jenks.on('click', function () {
            uncolor_icons();
            this.style.border = 'solid 1px green';
            let selected_field = field_selec.node().value,
                _values = user_data[layer].map(v => v[selected_field]),
                n_class = getOptNbClass(_values.length);
            let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'jenks', n_class);
            self.rendering_params[selected_field] = {
                nb_class: nb_class, type: 'jenks', colors: color_array,
                breaks: breaks, no_data: no_data_color,
                colorsByFeature: colors_map, renderer: 'Choropleth',
                rendered_field: selected_field, schema: ['Reds']
            };
            choro_mini_choice_disc.html(i18next.t('app_page.common.jenks') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
            ok_button.attr('disabled', null);
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        });

        ico_quantiles.on('click', function () {
            uncolor_icons();
            this.style.border = 'solid 1px green';
            let selected_field = field_selec.node().value,
                _values = user_data[layer].map(v => v[selected_field]),
                n_class = getOptNbClass(_values.length);
            let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'quantiles', n_class);
            self.rendering_params[selected_field] = {
                nb_class: nb_class, type: 'quantiles', colors: color_array,
                breaks: breaks, no_data: no_data_color,
                colorsByFeature: colors_map, renderer: 'Choropleth',
                rendered_field: selected_field, schema: ['Reds']
            };
            choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
            // ok_button.attr("disabled", null);
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        });

        ico_equal_interval.on('click', function () {
            uncolor_icons();
            this.style.border = 'solid 1px green';
            let selected_field = field_selec.node().value,
                _values = user_data[layer].map(v => v[selected_field]),
                n_class = getOptNbClass(_values.length);
            let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'equal_interval', n_class);
            self.rendering_params[selected_field] = {
                nb_class: nb_class, type: 'equal_interval', colors: color_array,
                breaks: breaks, no_data: no_data_color,
                colorsByFeature: colors_map, renderer: 'Choropleth',
                rendered_field: selected_field, schema: ['Reds']
            };
            choro_mini_choice_disc.html(i18next.t('app_page.common.equal_interval') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
            // ok_button.attr("disabled", null);
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        });

        ico_q6.on('click', function () {
            uncolor_icons();
            this.style.border = 'solid 1px green';
            let selected_field = field_selec.node().value,
                _values = user_data[layer].map(v => v[selected_field]);
            let [nb_class, type, breaks, color_array, colors_map, no_data_color] = discretize_to_colors(_values, 'Q6', 6);
            self.rendering_params[selected_field] = {
                nb_class: nb_class, type: 'Q6', colors: color_array,
                breaks: breaks, no_data: no_data_color,
                colorsByFeature: colors_map, renderer: 'Choropleth',
                rendered_field: selected_field, schema: ['Reds']
            };
            choro_mini_choice_disc.html(i18next.t('app_page.common.Q6') + ', ' + i18next.t('app_page.common.class', {count: nb_class}));
            // ok_button.attr("disabled", null);
            img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        });

        btn_class.on('click', function () {
            let selected_field = field_selec.node().value,
                opt_nb_class = getOptNbClass(user_data[layer].length),
                conf_disc_box;

            if (self.rendering_params[selected_field]) {
                conf_disc_box = display_discretization(layer,
                                                       selected_field,
                                                       self.rendering_params[selected_field].nb_class,
                                                       {schema: self.rendering_params[selected_field].schema,
                                                        colors: self.rendering_params[selected_field].colors,
                                                        type: self.rendering_params[selected_field].type,
                                                        no_data: self.rendering_params[selected_field].no_data,
                                                        breaks: self.rendering_params[selected_field].breaks,
                                                        extra_options: self.rendering_params[selected_field].extra_options});

            } else {
                conf_disc_box = display_discretization(layer,
                                                       selected_field,
                                                       opt_nb_class,
                                                       { type: 'quantiles' });
            }
            conf_disc_box.then(function(confirmed) {
                if (confirmed) {
                    // ok_button.attr("disabled", null);
                    img_valid_disc.attr('src', '/static/img/Light_green_check.png');
                    choro_mini_choice_disc.html(
                        i18next.t('app_page.common.' + confirmed[1]) + ', ' + i18next.t('app_page.common.class', {count: confirmed[0]}));
                    uncolor_icons();
                    color_disc_icons(confirmed[1]);
                    self.rendering_params[selected_field] = {
                            nb_class: confirmed[0], type: confirmed[1],
                            breaks: confirmed[2], colors: confirmed[3],
                            schema: confirmed[5], no_data: confirmed[6],
                            colorsByFeature: confirmed[4], renderer:'Choropleth',
                            rendered_field: selected_field, new_name: '',
                            extra_options: confirmed[7]
                        };
                }
            });
        });

        ok_button.on('click', function () {
          let field_to_render = field_selec.node().value;
          if (self.rendering_params[field_to_render]) {
              let user_new_layer_name = uo_layer_name.node().value;
              self.rendering_params[field_to_render].new_name = check_layer_name(
                  user_new_layer_name.length > 0 ? user_new_layer_name : ['Choro', field_to_render, layer].join('_'));
              render_choro(layer, self.rendering_params[field_to_render]);
              handle_legend(self.rendering_params[field_to_render].new_name)
              switch_accordion_section();
          }
        });
        setSelected(field_selec.node(), fields[0]);
    },

    unfill: function () {
        let field_selec = document.getElementById('choro_field1'),
            nb_fields = field_selec.childElementCount;

        for(let i = nb_fields - 1; i > -1 ; --i) {
//            delete this.rendering_params[field_selec.children[i]];
            field_selec.removeChild(field_selec.children[i]);
        }
        d3.selectAll('.params').attr('disabled', true);
    },
    rendering_params: {}
};

var fields_Stewart = {
    fill: function(layer) {
        let other_layers = get_other_layer_names(),
            mask_selec = d3.select('#stewart_mask'),
            default_selected_mask;

        unfillSelectInput(mask_selec.node());
        mask_selec.append('option').text('None').attr('value', 'None');
        for(let lyr_name of other_layers) {
            if (current_layers[lyr_name].type === 'Polygon') {
                mask_selec.append('option').text(lyr_name).attr('value', lyr_name);
                if (current_layers[lyr_name].targeted) {
                    default_selected_mask = lyr_name;
                }
            }
        }
        if (default_selected_mask)
            setSelected(mask_selec.node(), default_selected_mask);

        if (layer) {
            // let fields = type_col(layer, "number"),
            let fields = getFieldsType('stock', layer),
                field_selec = section2.select('#stewart_field'),
                field_selec2 = section2.select('#stewart_field2');

            if (fields.length === 0) {
                display_error_num_field();
                return;
            }

            field_selec2.append('option').text(' ').attr('value', 'None');
            fields.forEach(field => {
                field_selec.append('option').text(field).attr('value', field);
                field_selec2.append('option').text(field).attr('value', field);
            });
            document.getElementById('stewart_span').value = get_first_guess_span('stewart');

            field_selec.on('change', function () {
                document.getElementById('stewart_output_name').value = ['Smoothed', this.value, layer].join('_');
            });
            section2.select('#stewart_yes')
                .on('click', render_stewart);
        }
        section2.selectAll('.params').attr('disabled', null);
    },

    unfill: function () {
        unfillSelectInput(document.getElementById('stewart_field'));
        unfillSelectInput(document.getElementById('stewart_field2'));
        unfillSelectInput(document.getElementById('stewart_mask'));
        d3.selectAll('.params').attr('disabled', true);
    }
};


function render_stewart() {
  let formToSend = new FormData(),
      doc = document,
      field1_n = doc.getElementById('stewart_field').value,
      field2_n = doc.getElementById('stewart_field2').value,
      var1_to_send = {},
      var2_to_send = {},
      layer = Object.getOwnPropertyNames(user_data)[0],
      bval = doc.getElementById('stewart_breaks').value.trim(),
      reso = +doc.getElementById('stewart_resolution').value,
      span = +doc.getElementById('stewart_span').value,
      beta = +doc.getElementById('stewart_beta').value,
      nb_class = doc.getElementById('stewart_nb_class').value,
      func_selec = doc.getElementById('stewart_func').value,
      mask_name = doc.getElementById('stewart_mask').value,
      new_user_layer_name = document.getElementById('stewart_output_name').value;

  if (nb_class !== (nb_class | 0)) {
      nb_class = (nb_class | 0);
      doc.getElementById('stewart_nb_class').value = nb_class;
  }

  if (reso && reso > 0) {
      let res_test = test_maxmin_resolution(reso);
      if (res_test) {
          let message = res_test === 'low' ? i18next.t('app_page.common.error_too_low_resolution') : i18next.t('app_page.common.error_too_high_resolution')
          display_error_during_computation(message);
          return;
      }
      reso = reso * 1000;
  } else {
      reso = null;
  }
  bval = bval.length > 0 ? bval.split('-').map(val => +val.trim()) : null;

  var1_to_send[field1_n] = current_layers[layer].original_fields.has(field1_n) ? [] : user_data[layer].map(i => +i[field1_n]);
  if (field2_n !== 'None') {
      var2_to_send[field2_n] = current_layers[layer].original_fields.has(field2_n) ? [] : user_data[layer].map(i => +i[field2_n]);
  }

  formToSend.append('json', JSON.stringify({
    topojson: current_layers[layer].key_name,
    variable1: var1_to_send,
    variable2: var2_to_send,
    span: span * 1000,
    beta: beta,
    typefct: func_selec,
    resolution: reso,
    nb_class: nb_class,
    user_breaks: bval,
    mask_layer: mask_name !== 'None' ? current_layers[mask_name].key_name : ''
  }));

  xhrequest('POST', 'compute/stewart', formToSend, true)
      .then(res => {
          let data_split = res.split('|||'),
              raw_topojson = data_split[0],
              options = { result_layer_on_add: true, func_name: 'smooth' };
          if (new_user_layer_name.length > 0) {
              options['choosed_name'] = new_user_layer_name;
          }
          var n_layer_name = add_layer_topojson(raw_topojson, options);
          if (!n_layer_name)
              return;
          var class_lim = JSON.parse(data_split[1]),
              col_pal = getColorBrewerArray(class_lim.min.length, 'Oranges'),
              nb_class = class_lim['min'].length,
              colors_breaks = [];
          for(let i = 0; i < nb_class; i++) {
               colors_breaks.push([class_lim['min'][i] + ' - ' + class_lim['max'][i], col_pal[nb_class - 1 - i]]);
          }

          current_layers[n_layer_name].fill_color = {'class': []};
          current_layers[n_layer_name].renderer = 'Stewart';
          current_layers[n_layer_name].colors_breaks = colors_breaks;
          current_layers[n_layer_name].rendered_field = field1_n;
          current_layers[n_layer_name].color_palette = {name: 'Oranges', reversed: true};
          current_layers[n_layer_name].options_disc = {breaks: [].concat(class_lim['max'][0], class_lim['min']).reverse()};
          map.select('#' + _app.layer_to_id.get(n_layer_name))
                  .selectAll('path')
                  .styles( (d,i) => ({ fill: col_pal[nb_class - 1 - i], 'fill_opacity': 1, 'stroke-opacity': 0 }));
          handle_legend(n_layer_name);
          switch_accordion_section();
          // Todo : use the function render_choro to render the result from stewart too
      }, error => {
          display_error_during_computation();
          console.log(error);
      }).catch(function(err) {
          display_error_during_computation();
          console.log(err);
      });;
}


function fillMenu_Stewart() {
    var dialog_content = make_template_functionnality(section2);

    let a = dialog_content.append('p').attr('class', 'params_section2');
    a.append('span')
      .style('margin', '10px 0px 0px')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.field' })
      .html(i18next.t('app_page.func_options.smooth.field'));
    a.append('span')
      .insert('select')
      .attrs({ class: 'params marg_auto', id: 'stewart_field' });

    let b = dialog_content.append('p').attr('class', 'params_section2');
    b.append('span')
      .style('margin', '10px 0px 0px')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.divide_field' })
      .html(i18next.t('app_page.func_options.smooth.divide_field'));
    b.insert('select')
      .attrs({ class: 'params marg_auto', id: 'stewart_field2' });

    let p_span = dialog_content.append('p').attr('class', 'params_section2');
    p_span.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.span' })
      .text(i18next.t('app_page.func_options.smooth.span'));
    p_span.append('input')
      .style('width', '60px')
      .attrs({ type: 'number', class: 'params', id: 'stewart_span', value: 5, min: 0, max: 100000, step: 'any' });
    p_span.append('span')
      .html(' (km)');

    let d = dialog_content.append('p').attr('class', 'params_section2');
    d.append('span')
      .styles({ 'margin-right': '35px' })
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.beta' })
      .html(i18next.t('app_page.func_options.smooth.beta'));
    d.insert('input')
      .style('width', '60px')
      .attrs({ type: 'number', class: 'params', id: 'stewart_beta', value: 2, min: 0, max: 11, step: 'any' });

    let p_reso = dialog_content.append('p').attr('class', 'params_section2');
    p_reso.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.resolution' })
      .text(i18next.t('app_page.func_options.smooth.resolution'));
    p_reso.insert('input')
      .style('width', '60px')
      .attrs({ type: 'number', class: 'params', id: 'stewart_resolution', min: 1, max: 1000000, step: 'any' });
    p_reso.insert('label')
      .html(' (km)');

    let f = dialog_content.append('p').attr('class', 'params_section2');
    f.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.func_options' })
      .html(i18next.t('app_page.func_options.smooth.function'));
    let func_selec = f.insert('select')
      .attrs({ class: 'params i18n', id: 'stewart_func' });

    let g = dialog_content.append('p').attr('class', 'params_section2');
    g.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.nb_class' })
      .html(i18next.t('app_page.func_options.smooth.nb_class'));
    g.insert('input')
      .style('width', '50px')
      .attrs({ type: 'number', class: 'params', id: 'stewart_nb_class', value: 8, min: 1, max: 22, step: 1 });

    let bvs = dialog_content.append('p').attr('class', 'params_section2');
    bvs.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.break_values' })
      .html(i18next.t('app_page.func_options.smooth.break_values'));
    bvs.insert('textarea')
      .styles({ width: '100%', height: '2.2em', 'font-size': '0.9em' })
      .attrs({ class: 'params i18n', id: 'stewart_breaks',
              'data-i18n': '[placeholder]app_page.common.expected_class',
              'placeholder': i18next.t('app_page.common.expected_class') });
    let m  = dialog_content.append('p')
      .attr('class', 'params_section2')
      .style('margin', 'auto');
    m.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.mask' })
      .html(i18next.t('app_page.func_options.smooth.mask'));

    dialog_content.insert('select')
      .attrs({ class: 'params', id: 'stewart_mask' })
      .styles({ position: 'relative', float: 'right', margin: '1px 0px 10px 0px' });

    [['exponential', 'app_page.func_options.smooth.func_exponential'],
     ['pareto', 'app_page.func_options.smooth.func_pareto']
     ].forEach( fun_name => {
        func_selec.append('option').text(i18next.t(fun_name[1])).attrs({ value: fun_name[0], 'data-i18n': '[text]' + fun_name[1] });
    });

    make_layer_name_button(dialog_content, 'stewart_output_name');
    make_ok_button(dialog_content, 'stewart_yes', false);
    dialog_content.selectAll('.params').attr('disabled', true);
}

var fields_Anamorphose = {
  fill: function(layer) {
    if (!layer) return;
    // let fields = type_col(layer, "number"),
    let fields = getFieldsType('stock', layer),
        field_selec = section2.select('#Anamorph_field'),
        algo_selec = section2.select('#Anamorph_algo'),
        ok_button = section2.select('#Anamorph_yes');

    if (fields.length === 0) {
      display_error_num_field();
      return;
    }
    algo_selec.on('change', function () {
      if (this.value === 'olson') {
        section2.selectAll('.opt_dougenik').style('display', 'none');
        section2.selectAll('.opt_olson').style('display', undefined);
      } else if (this.value === 'dougenik') {
        section2.selectAll('.opt_olson').style('display', 'none');
        section2.selectAll('.opt_dougenik').style('display', undefined);
      }
    })
    section2.selectAll('.params').attr('disabled', null);
    fields.forEach(function(field) {
        field_selec.append('option').text(field).attr('value', field);
    });

    field_selec.on('change', function () {
        let field_name = this.value,
            ref_value_field = document.getElementById('Anamorph_opt3');

        document.getElementById('Anamorph_output_name').value = ['Cartogram', this.value, layer].join('_');

        if (ref_value_field) {
            let max_val_field = max_fast(user_data[layer].map(obj => +obj[field_name]));
            ref_value_field.setAttribute('max', max_val_field);
            ref_value_field.value = max_val_field;
        }
    });

    ok_button.on('click', function () {
        let algo = algo_selec.node().value,
            nb_features = user_data[layer].length,
            field_name = field_selec.node().value,
            new_user_layer_name = document.getElementById('Anamorph_output_name').value;

        if (algo === 'olson') {
            // let ref_size = document.getElementById("Anamorph_olson_scale_kind").value,
            // let opt_scale_max = document.getElementById("Anamorph_opt2");
            // if (opt_scale_max.value > 100) {
            //     opt_scale_max.value = 100;
            // }
            // let scale_max = +document.getElementById("Anamorph_opt2").value / 100,
            let nb_ft = current_layers[layer].n_features,
                dataset = user_data[layer];

            // if (contains_empty_val(dataset.map(a => a[field_name]))) {
            //   discard_rendering_empty_val();
            //   return;
            // }

            let layer_select = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path'),
                sqrt = Math.sqrt,
                abs = Math.abs,
                d_val = [],
                transform = [];

            for(let i = 0; i < nb_ft; ++i) {
                let val = +dataset[i][field_name];
                // We deliberatly use 0 if this is a missing value :
                if (isNaN(val) || !isFinite(val)) val = 0
                d_val.push([i, val, +path.area(layer_select[i].__data__.geometry)]);
            }
            d_val.sort((a, b) => b[1] - a[1]);
            let ref = d_val[0][1] / d_val[0][2];
            d_val[0].push(1);

            for(let i= 0; i < nb_ft; ++i) {
                let val = d_val[i][1] / d_val[i][2];
                let scale = sqrt(val / ref);
                d_val[i].push(scale);
            }
            d_val.sort((a, b) => a[0] - b[0]);
            let formToSend = new FormData();
            formToSend.append('json',
                JSON.stringify({
                    topojson: current_layers[layer].key_name,
                    scale_values: d_val.map(ft => ft[3]),
                    field_name: field_name})
                );
            xhrequest('POST', 'compute/olson', formToSend, true)
                .then( result => {
                    let options = { result_layer_on_add: true, func_name: 'cartogram' };
                    if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
                        options['choosed_name'] = new_user_layer_name;
                    }
                    let n_layer_name = add_layer_topojson(result, options);
                    current_layers[n_layer_name].renderer = 'OlsonCarto';
                    current_layers[n_layer_name].rendered_field = field_name;
                    current_layers[n_layer_name].scale_max = 1;
                    current_layers[n_layer_name].ref_layer_name = layer;
                    current_layers[n_layer_name].scale_byFeature = transform;
                    map.select('#' + _app.layer_to_id.get(n_layer_name))
                            .selectAll('path')
                            .style('fill-opacity', 0.8)
                            .style('stroke', 'black')
                            .style('stroke-opacity', 0.8);
                    switch_accordion_section();
                }, err => {
                    display_error_during_computation();
                    console.log(err);
                });
        } else if (algo === 'dougenik') {
            let formToSend = new FormData(),
                var_to_send = {},
                nb_iter = document.getElementById('Anamorph_dougenik_iterations').value;

            var_to_send[field_name] = [];
            if (!current_layers[layer].original_fields.has(field_name)) {
                let table = user_data[layer],
                    to_send = var_to_send[field_name];
                for(let i=0, i_len=table.length; i<i_len; ++i) {
                    to_send.push(+table[i][field_name])
                }
            }
            formToSend.append('json', JSON.stringify({
              topojson: current_layers[layer].key_name,
              var_name: var_to_send,
              iterations: nb_iter
            }));

            xhrequest('POST', 'compute/carto_doug', formToSend, true)
                .then(data => {
                    let options = { result_layer_on_add: true, func_name: 'cartogram' };
                    if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
                        options['choosed_name'] = new_user_layer_name;
                    }
                    let n_layer_name = add_layer_topojson(data, options);
                    current_layers[n_layer_name].fill_color = { random: true };
                    current_layers[n_layer_name].is_result = true;
                    current_layers[n_layer_name]['stroke-width-const'] = 0.8;
                    current_layers[n_layer_name].renderer = 'Carto_doug';
                    current_layers[n_layer_name].rendered_field = field_name;
                    map.select('#' + _app.layer_to_id.get(n_layer_name))
                        .selectAll('path')
                        .style('fill', _ => randomColor())
                        .style('fill-opacity', 0.8)
                        .style('stroke', 'black')
                        .style('stroke-opacity', 0.8);
                    switch_accordion_section();
                }, error => {
                    display_error_during_computation();
                    console.log(error);
                });
        }
    });
    setSelected(field_selec.node(), field_selec.node().options[0].value);
  },

  unfill: function () {
    let field_selec = document.getElementById('Anamorph_field');
    section2.selectAll('.params').attr('disabled', true);
    unfillSelectInput(field_selec);
  }
}


function fillMenu_Anamorphose() {
    var dialog_content = make_template_functionnality(section2);

    let algo_choice = dialog_content.append('p').attr('class', 'params_section2');
    algo_choice.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.algo' })
      .html(i18next.t('app_page.func_options.cartogram.algo'));
    let algo_selec = algo_choice.insert('select')
      .attrs({ id: 'Anamorph_algo', class: 'params i18n' });

    let field_choice = dialog_content.append('p').attr('class', 'params_section2');
    field_choice.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.field' })
      .html(i18next.t('app_page.func_options.cartogram.field'));
    let field_selec = field_choice.insert('select')
      .attrs({ class: 'params', id: 'Anamorph_field' });

    // Options for Dougenik mode :
    let doug1 = dialog_content.append('p')
      .attr('class', 'params_section2 opt_dougenik');
    doug1.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.dougenik_iterations' })
      .html(i18next.t('app_page.func_options.cartogram.dougenik_iterations'));
    doug1.insert('input')
      .attrs({ type: 'number', class: 'params', value: 5, min: 1, max: 12, step: 1, id: 'Anamorph_dougenik_iterations' });

    // let o2 = dialog_content.append('p').attr('class', 'params_section2 opt_olson');

     [['Dougenik & al. (1985)', 'dougenik'],
      ['Olson (2005)', 'olson']].forEach(function(fun_name) {
        algo_selec.append('option').text(fun_name[0]).attr('value', fun_name[1]);
    });

    make_layer_name_button(dialog_content, 'Anamorph_output_name');
    make_ok_button(dialog_content, 'Anamorph_yes', false);

    dialog_content.selectAll('.params').attr('disabled', true);
    dialog_content.selectAll('.opt_olson').style('display', 'none');
}

function getCentroids(ref_layer_selection) {
  let centroids = [];
  for(let i = 0, nb_features = ref_layer_selection.length; i < nb_features; ++i) {
    let geom = ref_layer_selection[i].__data__.geometry;
    if (geom.type.indexOf('Multi') < 0) {
      centroids.push(path.centroid(geom));
    } else {
      let areas = [];
      for(let j = 0; j < geom.coordinates.length; j++) {
        areas.push(path.area({
          type: geom.type,
          coordinates: [geom.coordinates[j]]
        }));
      }
      let ix_max = areas.indexOf(max_fast(areas));
      centroids.push(path.centroid({
        type: geom.type,
        coordinates: [geom.coordinates[ix_max]]
      }));
    }
  }
  return centroids;
}

function make_prop_line(rendering_params, geojson_line_layer) {
    let layer = rendering_params.ref_layer_name,
        field = rendering_params.field,
        color_field = rendering_params.color_field,
        t_field_name = 'prop_value',
        nb_features = rendering_params.nb_features,
        abs = Math.abs,
        ref_size = rendering_params.ref_size,
        ref_value = rendering_params.ref_value,
        symbol_type = rendering_params.symbol,
        layer_to_add = rendering_params.new_name,
        zs = d3.zoomTransform(svg_map).k,
        propSize = new PropSizer(ref_value, ref_size, symbol_type);

    if (!geojson_line_layer) {
        function make_geojson_line_layer() {
          let ref_layer_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path'),
              result = [];
          for(let i = 0, nb_features = ref_layer_selection.length; i < nb_features; ++i) {
            let ft = ref_layer_selection[i].__data__,
                value = +ft.properties[field],
                new_obj = {
                    id: i,
                    type: 'Feature',
                    properties: {},
                    geometry: cloneObj(ft.geometry)
                  };
            if (f_ix_len) {
                for(let f_ix=0; f_ix < f_ix_len; f_ix++) {
                    new_obj.properties[fields_id[f_ix]] = ft.properties[fields_id[f_ix]];
                }
            }
            new_obj.properties[field] = value;
            new_obj.properties[t_field_name] = propSize.scale(value);
            new_obj.properties['color'] = get_color(value, i);
            if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
            result.push([value, new_obj])
          }
          result.sort((a, b) => abs(b[0]) - abs(a[0]));
          return {
            type: 'FeatureCollection',
            features: result.map( d => d[1])
          };
        }

        let get_color, col1, col2,
            fields_id = getFieldsType('id', layer),
            f_ix_len = fields_id ? fields_id.length : 0;

        if (rendering_params.break_val != undefined && rendering_params.fill_color.two) {
            col1 = rendering_params.fill_color.two[0],
            col2 = rendering_params.fill_color.two[1];
            get_color = (val, ix) => val > rendering_params.break_val ? col2 : col1;
        } else if (rendering_params.fill_color instanceof Array && rendering_params.fill_color.length === nb_features) {
            get_color = (val, ix) => rendering_params.fill_color[ix];
        } else {
            get_color = () => rendering_params.fill_color;
        }

        geojson_line_layer = make_geojson_line_layer();
    }

    let layer_id = encodeId(layer_to_add);
    _app.layer_to_id.set(layer_to_add, layer_id);
    _app.id_to_layer.set(layer_id, layer_to_add);
    result_data[layer_to_add] = [];
    map.insert('g', '.legend')
      .attrs({ id: layer_id, class: 'layer' })
      .styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      .selectAll('path')
      .data(geojson_line_layer.features)
      .enter()
      .append('path')
      .attr('d', path)
      .styles( d => {
        result_data[layer_to_add].push(d.properties);
        return {
          fill: 'transparent', stroke: d.properties.color, 'stroke-width': d.properties[t_field_name]}
        });

    current_layers[layer_to_add] = {
        n_features: nb_features,
        renderer: rendering_params.renderer || 'PropSymbols',
        symbol: symbol_type,
        rendered_field: field,
        size: [ref_value, ref_size],
        // "stroke-width-const": 1,
        is_result: true,
        ref_layer_name: layer,
        type: 'Line'
        };

    if (rendering_params.fill_color.two != undefined) {
        current_layers[layer_to_add]['fill_color'] = cloneObj(rendering_params.fill_color);
    } else if (rendering_params.fill_color instanceof Array) {
        current_layers[layer_to_add]['fill_color'] = {'class': geojson_line_layer.features.map(v => v.properties.color)};
    } else {
        current_layers[layer_to_add]['fill_color'] = {'single' : rendering_params.fill_color};
    }
    if (rendering_params.break_val != undefined) {
        current_layers[layer_to_add]['break_val'] = rendering_params.break_val;
    }
    create_li_layer_elem(layer_to_add, nb_features, ['Line', 'prop'], 'result');
    return;
}


function make_prop_symbols(rendering_params, geojson_pt_layer) {
    let layer = rendering_params.ref_layer_name,
        field = rendering_params.field,
        color_field = rendering_params.color_field,
        t_field_name = 'prop_value',
        nb_features = rendering_params.nb_features,
        abs = Math.abs,
        ref_size = rendering_params.ref_size,
        ref_value = rendering_params.ref_value,
        symbol_type = rendering_params.symbol,
        layer_to_add = rendering_params.new_name,
        zs = d3.zoomTransform(svg_map).k,
        propSize = new PropSizer(ref_value, ref_size, symbol_type);

    if (!geojson_pt_layer) {
        function make_geojson_pt_layer() {
          let ref_layer_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path'),
              result = [];
          for(let i = 0, nb_features = ref_layer_selection.length; i < nb_features; ++i) {
            let ft = ref_layer_selection[i].__data__,
                value = +ft.properties[field],
                new_obj = {
                    id: i,
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Point' }
                  };
            if (ft.geometry.type.indexOf('Multi') < 0) {
              if (f_ix_len) {
                  for(let f_ix=0; f_ix < f_ix_len; f_ix++) {
                      new_obj.properties[fields_id[f_ix]] = ft.properties[fields_id[f_ix]];
                  }
              }
              new_obj.properties[field] = value;
              new_obj.properties[t_field_name] = propSize.scale(value);
              new_obj.geometry['coordinates'] = d3.geoCentroid(ft.geometry);
              new_obj.properties['color'] = get_color(value, i);
              if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
              result.push([value, new_obj])
            } else {
              let areas = [];
              for(let j = 0; j < ft.geometry.coordinates.length; j++) {
                areas.push(path.area({
                  type: ft.geometry.type,
                  coordinates: [ft.geometry.coordinates[j]]
                }));
              }
              let ix_max = areas.indexOf(max_fast(areas));
              if (f_ix_len) {
                  for(let f_ix=0; f_ix < f_ix_len; f_ix++) {
                      new_obj.properties[fields_id[f_ix]] = ft.properties[fields_id[f_ix]];
                  }
              }
              new_obj.properties[field] = value;
              new_obj.properties[t_field_name] = propSize.scale(value);
              new_obj.geometry['coordinates'] = d3.geoCentroid({ type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
              new_obj.properties['color'] = get_color(value, i);
              if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
              result.push([value, new_obj]);
            }
          }
          result.sort((a, b) => abs(b[0]) - abs(a[0]));
          return {
            type: 'FeatureCollection',
            features: result.map( d => d[1])
          };
        }

        let get_color, col1, col2,
            fields_id = getFieldsType('id', layer),
            f_ix_len = fields_id ? fields_id.length : 0;

        if (rendering_params.break_val != undefined && rendering_params.fill_color.two) {
            col1 = rendering_params.fill_color.two[0],
            col2 = rendering_params.fill_color.two[1];
            get_color = (val, ix) => val > rendering_params.break_val ? col2 : col1;
        } else if (rendering_params.fill_color instanceof Array && rendering_params.fill_color.length === nb_features) {
            get_color = (val, ix) => rendering_params.fill_color[ix];
        } else {
            get_color = () => rendering_params.fill_color;
        }

        geojson_pt_layer = make_geojson_pt_layer();
    }
    let layer_id = encodeId(layer_to_add);
    _app.layer_to_id.set(layer_to_add, layer_id);
    _app.id_to_layer.set(layer_id, layer_to_add);
    result_data[layer_to_add] = []
    if (symbol_type === 'circle') {
      map.insert('g', '.legend')
        .attr('id', layer_id)
        .attr('class', 'layer')
        .selectAll('circle')
        .data(geojson_pt_layer.features)
        .enter()
        .append('circle')
        .attrs( (d,i) => {
            result_data[layer_to_add].push(d.properties);
            return {
              'id': ['PropSymbol_', i, ' feature_', d.id].join(''),
              'r': d.properties[t_field_name],
              'cx': path.centroid(d)[0],
              'cy': path.centroid(d)[1]
            }
          })
        .style('fill', d => d.properties.color)
        .style('stroke', 'black')
        .style('stroke-width', 1 / zs)
        .call(drag_elem_geo2);
    } else if (symbol_type === 'rect') {
      map.insert('g', '.legend')
        .attr('id', layer_id)
        .attr('class', 'layer')
        .selectAll('circle')
        .data(geojson_pt_layer.features)
        .enter()
        .append('rect')
        .attrs( (d,i) => {
            let size = d.properties[t_field_name];
            result_data[layer_to_add].push(d.properties);
            return {
              'id': ['PropSymbol_', i, ' feature_', d.id].join(''),
              'height': size,
              'width': size,
              'x': path.centroid(d)[0] - size / 2,
              'y': path.centroid(d)[1] - size / 2
            };
          })
        .style('fill', d => d.properties.color)
        .style('stroke', 'black')
        .style('stroke-width', 1 / zs)
        .call(drag_elem_geo2);
    }

    current_layers[layer_to_add] = {
        n_features: nb_features,
        renderer: rendering_params.renderer || 'PropSymbols',
        symbol: symbol_type,
        rendered_field: field,
        size: [ref_value, ref_size],
        'stroke-width-const': 1,
        is_result: true,
        ref_layer_name: layer,
        draggable: false
        };

    if (rendering_params.fill_color.two != undefined) {
        current_layers[layer_to_add]['fill_color'] = cloneObj(rendering_params.fill_color);
    } else if (rendering_params.fill_color instanceof Array) {
        current_layers[layer_to_add]['fill_color'] = { class: geojson_pt_layer.features.map(v => v.properties.color)};
    } else {
        current_layers[layer_to_add]['fill_color'] = { single : rendering_params.fill_color};
    }
    if (rendering_params.break_val != undefined) {
        current_layers[layer_to_add]['break_val'] = rendering_params.break_val;
    }
    create_li_layer_elem(layer_to_add, nb_features, ['Point', 'prop'], 'result');
    return;
}

function render_categorical(layer, rendering_params) {
    if (rendering_params.new_name) {
        let fields = [].concat(getFieldsType('id', layer), rendering_params['rendered_field']);
        copy_layer(layer, rendering_params.new_name, 'typo', fields);
        current_layers[rendering_params.new_name].key_name = current_layers[layer].key_name;
        current_layers[rendering_params.new_name].type = current_layers[layer].type;
        layer = rendering_params.new_name;
    }

    var colorsByFeature = rendering_params.colorByFeature,
        color_map = rendering_params.color_map,
        field = rendering_params.rendered_field;
    var layer_to_render = map.select('#' + _app.layer_to_id.get(layer));
    layer_to_render
        .style('opacity', 1)
        .style('stroke-width', 0.75/d3.zoomTransform(svg_map).k + 'px');
    if (current_layers[layer].type === 'Line') {
        layer_to_render
            .selectAll('path')
            .styles({ fill: 'transparent', 'stroke-opacity': 1 })
            .style('stroke', (d,i) => colorsByFeature[i]);
    } else {
        layer_to_render.selectAll('path')
            .style('fill', (d,i) => colorsByFeature[i])
            .styles({ 'fill-opacity': 0.9, 'stroke-opacity': 0.9, stroke: '#000' });
    }
    current_layers[layer].renderer = rendering_params['renderer'];
    current_layers[layer].rendered_field = field;
    current_layers[layer].fill_color = {'class': rendering_params['colorByFeature']};
    current_layers[layer]['stroke-width-const'] = 0.75;
    current_layers[layer].is_result = true;
    current_layers[layer].color_map = color_map;
    zoom_without_redraw();
}

// Function to render the `layer` according to the `rendering_params`
// (layer should be the name of group of path, ie. not a PropSymbol layer)
// Currently used fo "choropleth", "MTA - relative deviations", "gridded map" functionnality
function render_choro(layer, rendering_params) {
    if (rendering_params.new_name) {
        let fields = [].concat(getFieldsType('id', layer), rendering_params['rendered_field']);
        copy_layer(layer, rendering_params.new_name, 'choro', fields);
        //Assign the same key to the cloned layer so it could be used transparently on server side
        // after deletion of the reference layer if needed :
        current_layers[rendering_params.new_name].key_name = current_layers[layer].key_name;
        current_layers[rendering_params.new_name].type = current_layers[layer].type;
        layer = rendering_params.new_name;
    }
    let breaks = rendering_params['breaks'];
    let options_disc = {schema: rendering_params.schema,
                        colors: rendering_params.colors,
                        no_data: rendering_params.no_data,
                        type: rendering_params.type,
                        breaks: breaks,
                        extra_options: rendering_params.extra_options}
    var layer_to_render = map.select('#'+_app.layer_to_id.get(layer));
    layer_to_render
        .style('opacity', 1)
        .style('stroke-width', 0.75/d3.zoomTransform(svg_map).k, + 'px');
    if (current_layers[layer].type === 'Line') {
        layer_to_render
            .selectAll('path')
            .styles({ fill: 'transparent', 'stroke-opacity': 1 })
            .style('stroke', (d,i) => rendering_params['colorsByFeature'][i] );
    } else {
        layer_to_render
            .selectAll('path')
            .styles({ 'fill-opacity': 1, 'stroke-opacity': 1, 'stroke': '#000' })
            .style('fill', (d,i) => rendering_params['colorsByFeature'][i] );
    }
    current_layers[layer].renderer = rendering_params['renderer'];
    current_layers[layer].rendered_field = rendering_params['rendered_field'];
    current_layers[layer].fill_color = {'class': rendering_params['colorsByFeature']};
    current_layers[layer]['stroke-width-const'] = 0.75;
    current_layers[layer].is_result = true;
    current_layers[layer].options_disc = options_disc;
    let colors_breaks = [];
    for(let i = breaks.length-1; i > 0; --i) {
        colors_breaks.push([
                [breaks[i-1], ' - ', breaks[i]].join(''),
                rendering_params['colors'][i-1]
            ]);
        }
    current_layers[layer].colors_breaks = colors_breaks;
    zoom_without_redraw();
}

function render_mini_chart_serie(values, parent, cap, bins) {
  bins = bins || values.length > 20 ? 16 : values.length > 15 ? 10 : 5;
  var class_count = getBinsCount(values, bins),
      background = '#f1f1f1',
      color = '#6633ff',
      width = 3 * bins - 3,
      height = 25,
      canvas = document.createElement('canvas');
  cap = cap || max_fast(class_count.counts);
  canvas.width = width;
  canvas.height = height;

  let old = parent.querySelector('canvas');
  if (old) old.remove();
  parent.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let x = 0,
      y = 0,
      barwidth = 2,
      barspace = 1;

  ctx.fillStyle = color;
  for (let i = 0; i < bins; i++) {
    var barheight = Math.floor(Math.min(class_count.counts[i] / cap, 1) * (height - 1));
    x += barspace;
    ctx.fillRect(x, height, barwidth, - barheight);
    x += barwidth;
  }
  canvas.setAttribute('tooltip-info', make_mini_summary(class_count))
  new Tooltip(canvas, {
          dataAttr: 'tooltip-info',
          animation: 'slideNfade',
          duration: 50,
          delay: 100,
          container: document.getElementById('twbs'),
          placement: 'top'
      });
}

function make_mini_summary(summary) {
    let p = Math.max(get_nb_decimals(summary.min), get_nb_decimals(summary.max)),
        props = {min : summary.min, max: summary.max, mean: summary.mean.toFixed(p),
                 median: summary.median.toFixed(p), stddev: summary.stddev.toFixed(p)};
    return i18next.t('app_page.stat_summary.mini_summary', props);
}

 function fillMenu_PropSymbolTypo(layer) {
    var dv2 = make_template_functionnality(section2);

    let a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.field1' })
      .html(i18next.t('app_page.func_options.proptypo.field1'))
    let field1_selec = a.insert('select')
      .attrs({ class: 'params', id: 'PropSymbolTypo_field_1' });

    let b = dv2.append('p').attr('class', 'params_section2');
    b.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.fixed_size' })
      .html(i18next.t('app_page.func_options.proptypo.fixed_size'));
    let ref_size = b.insert('input')
        .attrs({ type: 'number', class: 'params', id: 'PropSymbolTypo_ref_size',
                min: 0.1, max: 100.0, value: 60.0, step: 'any' })
        .style('width', '50px');
    b.append('span').html(' (px)');

    let c = dv2.append('p').attr('class', 'params_section2');
    c.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.on_value' })
      .html(i18next.t('app_page.func_options.proptypo.on_value'))
    let ref_value = c.insert('input')
      .styles({ width: '100px', 'margin-left': '10px' })
      .attrs({ type: 'number', class: 'params', id: 'PropSymbolTypo_ref_value' })
      .attrs({ min: 0.1, step: 0.1 });

    // Other symbols could probably easily be proposed :
    let d = dv2.append('p').attr('class', 'params_section2');
    d.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.symbol_type' })
      .html(i18next.t('app_page.func_options.proptypo.symbol_type'));
    let symb_selec = d.insert('select')
      .attrs({ class: 'params', id: 'PropSymbolTypo_symbol_type' });

    let e = dv2.append('p').attr('class', 'params_section2');
    e.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.field2' })
      .html(i18next.t('app_page.func_options.proptypo.field2'));
    var field2_selec = e.insert('select')
        .attrs({ class: 'params', id: 'PropSymbolTypo_field_2' });

    let f = dv2.insert('p').styles({ margin: 'auto', 'text-align': 'center' });
    f.append('button')
      .attrs({ id: 'Typo_class', class: 'button_disc params i18n',
               'data-i18n': '[html]app_page.func_options.typo.color_choice' })
      .styles({ 'font-size': '0.8em', 'text-align': 'center' })
      .html(i18next.t('app_page.func_options.typo.color_choice'));

    make_layer_name_button(dv2, 'PropSymbolTypo_output_name');
    make_ok_button(dv2, 'propTypo_yes');
    section2.selectAll('.params').attr('disabled', true);
}

function prepare_categories_array(layer_name, selected_field, col_map) {
    let cats = [];
    if (!col_map) {
        col_map = new Map();
        for(let i = 0, data_layer = user_data[layer_name]; i < data_layer.length; ++i) {
            let value = data_layer[i][selected_field],
                ret_val = col_map.get(value);
            col_map.set(value, ret_val ? [ret_val[0] + 1, [i].concat(ret_val[1])] : [1, [i]]);
        }
        col_map.forEach( (v,k) => {
            cats.push({ name: k, display_name: k, nb_elem: v[0], color: randomColor() });
        });
        col_map = new Map();
        for(let i=0; i<cats.length; i++) {
            col_map.set(cats[i].name, [cats[i].color, cats[i].name, cats[i].nb_elem]);
        }
    } else {
        col_map.forEach( (v,k) => {
            cats.push({ name: k, display_name: v[1], nb_elem: v[2], color: v[0] });
      });
    }
    return [cats, col_map];
}

var fields_PropSymbolTypo = {
    fill: function(layer) {
        if (!layer) return;
        section2.selectAll('.params').attr('disabled', null);
        let self = this,
            fields_num = getFieldsType('stock', layer),
            fields_categ = getFieldsType('category', layer),
            nb_features = user_data[layer].length,
            field1_selec = section2.select('#PropSymbolTypo_field_1'),
            field2_selec = section2.select('#PropSymbolTypo_field_2'),
            ref_value_field = section2.select('#PropSymbolTypo_ref_value'),
            ref_size = section2.select('#PropSymbolTypo_ref_size'),
            symb_selec = section2.select('#PropSymbolTypo_symbol_type'),
            uo_layer_name = section2.select('#PropSymbolTypo_output_name'),
            btn_typo_class = section2.select('#Typo_class'),
            ok_button = section2.select('#propTypo_yes');

        let prepare_colors = (field) => {
            let [cats, col_map] = prepare_categories_array(layer, field, null);
            let nb_class = col_map.size;
            let colorByFeature = user_data[layer].map(ft => col_map.get(ft[field])[0]);
            self.rendering_params[field] = {
                nb_class: nb_class, color_map: col_map, colorByFeature: colorByFeature,
                renderer: 'Categorical', rendered_field: field, skip_alert: false
            };

        }

        if (fields_categ.length === 0 || fields_num.length === 0) {
            display_error_num_field();
            return;
        }

        if (current_layers[layer].type === 'Line') {
            ref_size.attr('value', 10.0);
            [['app_page.func_options.common.symbol_line', 'line'],
             ['app_page.func_options.common.symbol_circle', 'circle'],
             ['app_page.func_options.common.symbol_square', 'rect']
            ].forEach(function(symb) {
                symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
            });
        } else {
          ref_size.attr('value', 60.0);
          [['app_page.func_options.common.symbol_circle', 'circle'],
           ['app_page.func_options.common.symbol_square', 'rect']
          ].forEach(function(symb) {
              symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
          });
        }

        fields_num.forEach(field => {
            field1_selec.append('option').text(field).attr('value', field);
        });

        fields_categ.forEach(field => {
          field2_selec.append('option').text(field).attr('value', field);
        });

        // Set some default colors in order to not force to open the box for selecting them :
        {
          let first_field = fields_categ[0];
          prepare_colors(first_field);
          ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
        }

        field1_selec.on('change', function () {
            let field_name = this.value,
                max_val_field = max_fast(user_data[layer].map(obj => +obj[field_name]));
            ref_value_field.attrs({ max: max_val_field, value: max_val_field });
            uo_layer_name.attr('value', ['Typo', field_name, field2_selec.node().value, layer].join('_'));
        });

        field2_selec.on('change', function () {
            let field_name = this.value;
            prepare_colors(field_name);
            // ok_button.attr("disabled", self.rendering_params[field_name] ? null : true);
            uo_layer_name.attr('value', ['Typo', field1_selec.node().value, field_name, layer].join('_'));
        });

        btn_typo_class.on('click', function () {
            let selected_field = field2_selec.node().value,
                new_layer_name = check_layer_name(['Typo', field1_selec.node().value, selected_field, layer].join('_')),
                col_map = self.rendering_params[selected_field] ? self.rendering_params[selected_field].color_map : undefined,
                cats;
            [cats, col_map] = prepare_categories_array(layer, selected_field, col_map);

            if (cats.length > 15) {
                swal({ title: '',
                  text: i18next.t('app_page.common.error_too_many_features_color'),
                  type: 'warning',
                  showCancelButton: true,
                  allowOutsideClick: false,
                  confirmButtonColor: '#DD6B55',
                  confirmButtonText: i18next.t('app_page.common.valid') + '!',
                  cancelButtonText: i18next.t('app_page.common.cancel')
                }).then(() => {
                    display_categorical_box(user_data[layer], layer, selected_field, cats)
                      .then(function(confirmed) {
                        if (confirmed) {
                          // ok_button.attr("disabled", null);
                          self.rendering_params[selected_field] = {
                            nb_class: confirmed[0], color_map :confirmed[1], colorByFeature: confirmed[2],
                            renderer:'Categorical', rendered_field: selected_field, new_name: new_layer_name, skip_alert: true
                          }
                        }
                      });
                }, dismiss => {
                  return;
                });
              } else {
                display_categorical_box(user_data[layer], layer, selected_field, cats)
                  .then(function(confirmed) {
                    if (confirmed) {
                      // ok_button.attr("disabled", null);
                      self.rendering_params[selected_field] = {
                        nb_class: confirmed[0], color_map :confirmed[1], colorByFeature: confirmed[2],
                        renderer:'Categorical', rendered_field: selected_field, new_name: new_layer_name, skip_alert: true
                      }
                    }
                  });
              }
        });

        ok_button.on('click', function () {
            let render = () => {
                render_PropSymbolTypo(
                    field1_selec.node().value,
                    field2_selec.node().value,
                    uo_layer_name.node().value,
                    ref_value_field.node().value,
                    section2.select('#PropSymbolTypo_ref_size').node().value,
                    section2.select('#PropSymbolTypo_symbol_type').node().value
                )
            };
            let field_color = field2_selec.node().value;
            if (self.rendering_params[field_color].color_map.size > 15 && !self.rendering_params[field_color].skip_alert) {
                swal({ title: '',
                  text: i18next.t('app_page.common.error_too_many_features_color'),
                  type: 'warning',
                  showCancelButton: true,
                  allowOutsideClick: false,
                  confirmButtonColor: '#DD6B55',
                  confirmButtonText: i18next.t('app_page.common.valid') + '!',
                  cancelButtonText: i18next.t('app_page.common.cancel')
                }).then(() => {
                  render();
                }, dismiss => { return; });
            } else {
                  render();
            }
        });
        setSelected(field1_selec.node(), fields_num[0]);
        setSelected(field2_selec.node(), fields_categ[0]);
    },

    unfill: function () {
        unfillSelectInput(document.getElementById('PropSymbolTypo_field_1'));
        unfillSelectInput(document.getElementById('PropSymbolTypo_field_2'));
        unfillSelectInput(document.getElementById('PropSymbolTypo_symbol_type'));
        section2.selectAll('.params').attr('disabled', true);
    },
    rendering_params: {}
};


function render_PropSymbolTypo(field1, color_field, new_layer_name, ref_value, ref_size, symb_selec) {
  if (!ref_value || !color_field || !fields_PropSymbolTypo.rendering_params[color_field])
      return;
  let layer = Object.getOwnPropertyNames(user_data)[0],
      nb_features = user_data[layer].length,
      rendering_params = fields_PropSymbolTypo.rendering_params[color_field],
      rd_params = {};

  new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : ['PropSymbolsTypo', field1, color_field, layer].join('_'));

  rd_params.field = field1;
  rd_params.new_name = new_layer_name;
  rd_params.nb_features = nb_features;
  rd_params.ref_layer_name = layer;
  rd_params.symbol = symb_selec;
  rd_params.ref_value = +ref_value;
  rd_params.color_field = color_field;
  rd_params.ref_size = +ref_size;
  rd_params.fill_color = rendering_params.colorByFeature;

  if (symb_selec === 'line')
      make_prop_line(rd_params);
  else
      make_prop_symbols(rd_params);

  Object.assign(current_layers[new_layer_name],{
      renderer: 'PropSymbolsTypo',
      rendered_field: field1,
      rendered_field2: color_field,
      color_map: rendering_params.color_map
  });
  zoom_without_redraw();
  switch_accordion_section();
  handle_legend(new_layer_name);
}

function fillMenu_Discont() {
    var dv2 = make_template_functionnality(section2);

    let a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.field' })
      .html(i18next.t('app_page.func_options.discont.field'));
    a.insert('select')
      .attrs({ class: 'params', id: 'field_Discont' });

    // let b = dv2.append('p').attr('class', 'params_section2');
    // b.append('span')
    //   .attrs({class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.id_field'})
    //   .html(i18next.t('app_page.func_options.discont.id_field'));
    // b.insert('select')
    //   .attrs({class: 'params', id: 'field_id_Discont'});

    let c = dv2.append('p').attr('class', 'params_section2');
    c.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.type_discontinuity' })
      .html(i18next.t('app_page.func_options.discont.type_discontinuity'));
    let discontinuity_type = c.insert('select')
      .attrs({ class: 'params i18n', id: 'kind_Discont' });

    [['app_page.func_options.discont.type_relative', 'rel'],
      ['app_page.func_options.discont.type_absolute', 'abs']
    ].forEach(k => {
        discontinuity_type.append('option').text(i18next.t(k[0])).attrs({ value: k[1], 'data-i18n': '[text]' + k[0] });
    });

    // let d = dv2.append('p').attr('class', 'params_section2');
    // d.append('span')
    //   .attrs({class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.nb_class'})
    //   .html(i18next.t('app_page.func_options.discont.nb_class'));
    // d.insert('input')
    //   .attrs({type: 'number', class: 'params', id: 'Discont_nbClass', min: 1, max: 33, value: 4})
    //   .style('width', '50px');

    let e = dv2.append('p').attr('class', 'params_section2');
    e.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.discretization' })
      .html(i18next.t('app_page.func_options.discont.discretization'))
    let disc_type = e.insert('select')
      .attrs({ class: 'params i18n', id: 'Discont_discKind' });

    [
     ['app_page.common.equal_interval', 'equal_interval'],
     ['app_page.common.quantiles', 'quantiles'],
     ['app_page.common.Q6', 'Q6'],
     ['app_page.common.arithmetic_progression', 'arithmetic_progression'],
     ['app_page.common.jenks', 'jenks']
    ].forEach(field => {
         disc_type.append('option').text(i18next.t(field[0])).attrs({ value: field[1], 'data-i18n': '[text]' + field[0] });
    });

    let f = dv2.append('p').attr('class', 'params_section2');
    f.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.color' })
      .html(i18next.t('app_page.func_options.discont.color'));
    f.insert('input')
      .attrs({ class: 'params', id: 'color_Discont', type: 'color', value: ColorsSelected.random() });

    make_layer_name_button(dv2, 'Discont_output_name');
    make_ok_button(dv2, 'yes_Discont', false);

    dv2.selectAll('.params').attr('disabled', true);
}

var fields_Discont = {
    fill: function(layer) {
        if (!layer) return;
        let fields_num = getFieldsType('stock', layer).concat(getFieldsType('ratio', layer)),
            fields_id = getFieldsType('id', layer),
            select_type_discont = section2.select('#kind_Discont'),
            field_discont = section2.select('#field_Discont'),
            // field_id = section2.select("#field_id_Discont"),
            ok_button = section2.select('#yes_Discont');

        if (fields_num.length === 0) {
            display_error_num_field();
            return;
        }

        select_type_discont.on('change', function () {
          let field_name = field_discont.node().value;
          document.getElementById('Discont_output_name').value = ['Disc', field_name, this.value, layer].join('_');
        });

        fields_num.forEach(function(field) {
          field_discont.append('option').text(field).attr('value', field);
        });
        // if (fields_id.length == 0) {
        //     field_id.append("option").text(i18next.t("app_page.common.default")).attrs({"value": "__default__", "class": "i18n", "data-i18n": "[text]app_page.common.default"});
        // } else {
        //   fields_id.forEach(function(field) {
        //       field_id.append("option").text(field).attr("value", field);
        //   });
        // }
        field_discont.on('change', function () {
          let discontinuity_type = document.getElementById('kind_Discont').value;
          document.getElementById('Discont_output_name').value = ['Disc', this.value, discontinuity_type, layer].join('_');
        });
        ok_button.on('click', render_discont);
        section2.selectAll('.params').attr('disabled', null);
        document.getElementById('Discont_output_name').value = ['Disc', field_discont.node().value, select_type_discont.node().value, layer].join('_');
    },
    unfill: function () {
        unfillSelectInput(document.getElementById('field_Discont'));
        // unfillSelectInput(document.getElementById("field_id_Discont"));
        section2.selectAll('.params').attr('disabled', true);
    }
}

var render_discont = function () {
    let layer = Object.getOwnPropertyNames(user_data)[0],
        field = document.getElementById('field_Discont').value,
        // field_id = document.getElementById("field_id_Discont").value,
        min_size = 1,
        max_size = 10,
        discontinuity_type = document.getElementById('kind_Discont').value,
        discretization_type = document.getElementById('Discont_discKind').value,
        nb_class = 4,
        user_color = document.getElementById('color_Discont').value,
        new_layer_name = document.getElementById('Discont_output_name').value;

    new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : ['Disc', field, discontinuity_type, layer].join('_'));

    let id_layer = encodeId(new_layer_name);
    _app.layer_to_id.set(new_layer_name, id_layer);
    _app.id_to_layer.set(id_layer, new_layer_name);

    // field_id = field_id == "__default__" ? undefined : field_id;
    let field_id = undefined;

    let result_value = new Map(),
        result_geom = {},
        topo_mesh = topojson.mesh,
        math_max = Math.max,
        topo_to_use = _target_layer_file;

    document.getElementById('overlay').style.display = '';

    // Discontinuity are computed in another thread to avoid blocking the ui (and so error message on large layer)
    // (a waiting message is displayed during this time to avoid action from the user)
    let discont_worker = new Worker('static/js/webworker_discont.js');
    _app.webworker_to_cancel = discont_worker;
    discont_worker.postMessage([topo_to_use, layer, field, discontinuity_type, discretization_type, field_id]);
    discont_worker.onmessage = function(e) {
        let [arr_tmp, d_res] = e.data;
        _app.webworker_to_cancel = undefined;
        let nb_ft = arr_tmp.length,
            step = (max_size - min_size) / (nb_class - 1),
            class_size = Array(nb_class).fill(0).map((d,i) => min_size + (i * step));

        let [ , , breaks, serie] = discretize_to_size(arr_tmp, discretization_type, nb_class, min_size, max_size);
        if (!serie || !breaks) {
            let opt_nb_class = Math.floor(1 + 3.3 * Math.log10(nb_ft));
            let w = nb_class > opt_nb_class ? i18next.t('app_page.common.smaller') : i18next.t('app_page.common.larger');
            swal('', i18next.t('app_page.common.error_discretization', {arg: w}), 'error');
            return;
        }

        breaks = breaks.map(ft => [ft[0], ft[1]]).filter(d => d[1] !== undefined);
        let result_layer = map.insert('g', '.legend')
          .attr('id', id_layer)
          .styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
          .attr('class', 'layer');

        result_data[new_layer_name] = [];
        let data_result = result_data[new_layer_name],
            result_lyr_node = result_layer.node();

        for(let i=0; i<nb_ft; i++) {
            let val = d_res[i][0],
                p_size = class_size[serie.getClass(val)],
                elem = result_layer.append('path')
                        .datum(d_res[i][2])
                        .attrs({ d: path, id: ['feature', i].join('_') })
                        .styles({ stroke: user_color, 'stroke-width': p_size, 'fill': 'transparent', 'stroke-opacity': 1 });
            data_result.push(d_res[i][1]);
            elem.node().__data__.geometry = d_res[i][2];
            elem.node().__data__.properties = data_result[i];
            elem.node().__data__.properties['prop_val'] = p_size;
        }
        document.getElementById('overlay').style.display = 'none';
        current_layers[new_layer_name] = {
            renderer: 'DiscLayer',
            breaks: breaks,
            min_display: 0, // FIXME
            type: 'Line',
            rendered_field: field,
            size: [0.5, 10],
            is_result: true,
            fixed_stroke: true,
            ref_layer_name: layer,
            fill_color: { 'single': user_color },
            n_features: nb_ft
            };
        create_li_layer_elem(new_layer_name, nb_ft, ['Line', 'discont'], 'result');


        { // Only display the 50% most important values :
          // TODO : reintegrate this upstream in the layer creation :
          let lim = 0.5 * current_layers[new_layer_name].n_features;
          result_layer.selectAll('path').style('display', (d,i) => i <= lim ? null : 'none' );
          current_layers[new_layer_name].min_display = 0.5;
        }

        d3.select('#layer_to_export').append('option').attr('value', new_layer_name).text(new_layer_name);
        zoom_without_redraw();
        switch_accordion_section();
        handle_legend(new_layer_name);
        send_layer_server(new_layer_name, '/layers/add');
        discont_worker.terminate();
    };
}

function fillMenu_PropSymbol(layer) {
    var dialog_content = make_template_functionnality(section2),
        max_allowed_size = Math.round(h/2 - h/10);

    let a = dialog_content.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' })
      .html(i18next.t('app_page.func_options.common.field'));
    let field_selec = a.insert('select')
      .attrs({ class: 'params', 'id': 'PropSymbol_field_1' });

    let b = dialog_content.append('p').attr('class', 'params_section2');
    b.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.fixed_size' })
      .html(i18next.t('app_page.func_options.prop.fixed_size'));
    let ref_size = b.insert('input')
      .attrs({ id: 'PropSymbol_ref_size', type: 'number', class: 'params', min: 0.2, max: max_allowed_size, value: 60.0, step: 0.1 })
      .style('width', '50px');
    b.append('span').html(' px');

    let c = dialog_content.append('p').attr('class', 'params_section2');
    c.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.on_value' })
      .html(i18next.t('app_page.func_options.prop.on_value'));
    let ref_value = c.insert('input')
      .styles({ width: '100px', 'margin-left': '10px' })
      .attrs({ id: 'PropSymbol_ref_value', type: 'number', class: 'params', min: 0.1, step: 0.1 });

    let d = dialog_content.append('p').attr('class', 'params_section2');
    d.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.symbol_type' })
      .html(i18next.t('app_page.func_options.prop.symbol_type'));
    let symb_selec = d.insert('select')
      .attrs({ class: 'params i18n', id: 'PropSymbol_symbol' });

    // [['app_page.func_options.common.symbol_circle', 'circle'],
    //  ['app_page.func_options.common.symbol_square', 'rect']
    // ].forEach(function(symb) {
    //     symb_selec.append("option").text(i18next.t(symb[0])).attrs({"value": symb[1], 'data-i18n': '[text]' + symb[0]});});

    let color_section = dialog_content.append('p').attr('class', 'params_section2');
    color_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.symbol_color' })
      .html(i18next.t('app_page.func_options.prop.symbol_color'));
    let color_par = color_section.append('select')
      .attrs({ id: 'PropSymbol_nb_colors', class: 'params' });
    color_par.append('option')
        .attrs({ value: 1, class: 'i18n', 'data-i18n': '[text]app_page.func_options.prop.options_one_color' })
        .text(i18next.t('app_page.func_options.prop.options_one_color'));
    color_par.append('option')
        .attrs({ value: 2, class: 'i18n', 'data-i18n': '[text]app_page.func_options.prop.options_two_colors' })
        .text(i18next.t('app_page.func_options.prop.options_two_colors'));

    let col_p = dialog_content.append('p')
      .attr('class', 'params_section2')
      .styles({ 'padding-top': '5px', 'margin-bottom': '-5px', 'text-align': 'center' });
    col_p.insert('input')
      .styles({ position: 'unset' })
      .attrs({ type: 'color', class: 'params', id: 'PropSymbol_color1', value: ColorsSelected.random() });
    col_p.insert('input')
      .styles({ display: 'none', position: 'unset' })
      .attrs({ type: 'color', class: 'params', id: 'PropSymbol_color2', value: ColorsSelected.random() });

    let col_b = dialog_content.insert('p').attr('class', 'params_section2');
    col_b.insert('span')
      .style('display', 'none')
      .attrs({ id: 'PropSymbol_color_txt', class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.options_break_two_colors' })
      .html(i18next.t('app_page.func_options.prop.options_break_two_colors'));
    col_b.insert('input')
      .attrs({ id: 'PropSymbol_break_val', 'type': 'number', class: 'params' })
      .styles({ display: 'none', width: '75px' });

    make_layer_name_button(dialog_content, 'PropSymbol_output_name');
    make_ok_button(dialog_content, 'PropSymbol_yes', false);
    dialog_content.selectAll('.params').attr('disabled', true);
}

var fields_PropSymbol = {
    fill: function(layer) {
        if (!layer) return;
        section2.selectAll('.params').attr('disabled', null);
        // let fields = type_col(layer, "number"),
        let fields = getFieldsType('stock', layer),
            nb_features = user_data[layer].length,
            field_selec = section2.select('#PropSymbol_field_1'),
            nb_color = section2.select('#PropSymbol_nb_colors'),
            ok_button = section2.select('#PropSymbol_yes'),
            ref_value_field = section2.select('#PropSymbol_ref_value'),
            ref_size = section2.select('#PropSymbol_ref_size'),
            symb_selec = section2.select('#PropSymbol_symbol'),
            uo_layer_name = section2.select('#PropSymbol_output_name'),
            fill_color = section2.select('#PropSymbol_color1'),
            fill_color2 = section2.select('#PropSymbol_color2'),
            fill_color_opt = section2.select('#PropSymbol_break_val'),
            fill_color_text = section2.select('#PropSymbol_color_txt');

        if (current_layers[layer].type === 'Line') {
            ref_size.attr('value', 10.0);
            [['app_page.func_options.common.symbol_line', 'line'],
             ['app_page.func_options.common.symbol_circle', 'circle'],
             ['app_page.func_options.common.symbol_square', 'rect']
            ].forEach(function(symb) {
                symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
            });
        } else {
          ref_size.attr('value', 60.0);
          [['app_page.func_options.common.symbol_circle', 'circle'],
           ['app_page.func_options.common.symbol_square', 'rect']
          ].forEach(function(symb) {
              symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
          });
        }

        fields.forEach(function(field) {
            field_selec.append('option').text(field).attr('value', field);
        });

        field_selec.on('change', function () {
            let field_name = this.value,
                field_values = user_data[layer].map(obj => +obj[field_name]),
                max_val_field = max_fast(field_values);

            uo_layer_name.attr('value', ['PropSymbol', this.value, layer].join('_'));
            ref_value_field.attrs({ max: max_val_field, value: max_val_field });
            if (has_negative(field_values)) {
                setSelected(nb_color.node(), 2);
                break_val.attr('value', 0);
            } else {
                setSelected(nb_color.node(), 1);
            }
        });

        nb_color.on('change', function () {
            if (+this.value === 1) {
                fill_color2.style('display', 'none');
                fill_color_opt.style('display', 'none');
                fill_color_text.style('display', 'none');
            } else {
                fill_color2.style('display', null);
                fill_color_opt.style('display', null);
                fill_color_text.style('display', 'inline');
            }
          });
        ok_button.on('click', function () {
            let nb_features = user_data[layer].length,
                field_to_render = field_selec.node().value,
                symbol_to_use = symb_selec.node().value,
                user_new_layer_name = uo_layer_name.node().value,
                new_layer_name = check_layer_name(
                  user_new_layer_name.length > 0 ? user_new_layer_name : ['PropSymbols', field_to_render, layer].join('_'));
            let rendering_params = {
                  field: field_to_render,
                  nb_features: nb_features,
                  new_name: new_layer_name,
                  ref_layer_name: layer,
                  symbol: symbol_to_use,
                  ref_size: +ref_size.node().value,
                  ref_value: +ref_value_field.node().value,
                  fill_color: fill_color.node().value
                };
            if (+nb_color.node().value === 2) {
                rendering_params['break_val'] = +fill_color_opt.node().value;
                rendering_params['fill_color'] = { two: [fill_color.node().value, fill_color2.node().value] };
            }
            if (symbol_to_use === 'line')
                make_prop_line(rendering_params);
            else
                make_prop_symbols(rendering_params);
            zoom_without_redraw();
            switch_accordion_section();
            handle_legend(new_layer_name);
        });
        uo_layer_name.attr('value', ['PropSymbols', layer].join('_'));
        setSelected(field_selec.node(), fields[0]);
    },

    unfill: function () {
        unfillSelectInput(document.getElementById('PropSymbol_field_1'));
        unfillSelectInput(document.getElementById('PropSymbol_symbol'));
        section2.selectAll('.params').attr('disabled', true);
    }
};

function fillMenu_TypoSymbol() {
    var dv2 = make_template_functionnality(section2);
    let a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.typosymbol.field' })
      .html(i18next.t('app_page.func_options.typosymbol.field'));
    let field_selec = a.insert('select')
      .attrs({ class: 'params', id: 'field_Symbol' });

    let b = dv2.insert('p')
      .attr('class', 'params_section2')
      .styles({ 'text-align': 'center', 'margin': 'auto' });
    b.append('button')
      .attrs({ id: 'selec_Symbol', class: 'button_disc params i18n',
              'data-i18n': '[html]app_page.func_options.typosymbol.symbols_choice' })
      .styles({ 'font-size': '0.8em', 'text-align': 'center' })
      .html(i18next.t('app_page.func_options.typosymbol.symbols_choice'));

    make_layer_name_button(dv2, 'TypoSymbols_output_name')
    make_ok_button(dv2, 'yesTypoSymbols');
    dv2.selectAll('.params').attr('disabled', true);
    if (!window.default_symbols) {
        window.default_symbols = [];
        prepare_available_symbols();
    }
}

function discard_rendering_empty_val() {
  swal({
    title: '',
    type: 'error',
    text: i18next.t('app_page.common.error_empty_vals')
  });
}

var fields_TypoSymbol = {
    fill: function(layer) {
        if (!layer) return;
        let fields_all = Object.getOwnPropertyNames(user_data[layer][0]),
            field_to_use = section2.select('#field_Symbol'),
            selec_symbol = section2.select('#selec_Symbol'),
            uo_layer_name = section2.select('#TypoSymbols_output_name'),
            ok_button = section2.select('#yesTypoSymbols'),
            self = this;

        section2.selectAll('.params').attr('disabled', null);
        fields_all.forEach(function(field) {
            field_to_use.append('option').text(field).attr('value', field);
        });
        field_to_use.on('change', function () {
            let field = this.value;
            ok_button.attr('disabled', self.rendering_params[field] ? null : true)
        });
        selec_symbol.on('click', function () {
            swal({ title: '',
              text: i18next.t('app_page.common.error_too_many_features'),
              type: 'warning',
              showCancelButton: true,
              allowOutsideClick: false,
              confirmButtonColor: '#DD6B55',
              confirmButtonText: i18next.t('app_page.common.valid') + '!',
              cancelButtonText: i18next.t('app_page.common.cancel')
            }).then(() => {
              let field = document.getElementById('field_Symbol').value,
                  symbol_map = self.rendering_params[field] ? self.rendering_params[field].symbols_map : undefined;
              display_box_symbol_typo(layer, field, symbol_map).then(confirmed => {
                if (confirmed) {
                  document.getElementById('yesTypoSymbols').disabled = null;
                  self.rendering_params[field] = {
                    nb_cat: confirmed[0],
                    symbols_map: confirmed[1],
                    field: field
                  };
                }
              });
            }, () => { return; });
        });
        ok_button.on('click', function () {
          let field = field_to_use.node().value;
          render_TypoSymbols(self.rendering_params[field], uo_layer_name.node().value);
        });
        setSelected(field_to_use.node(), fields_all[0]);
        uo_layer_name.attr('value', ['Symbols', layer].join('_'));
    },
    unfill: function () {
        unfillSelectInput(document.getElementById('field_Symbol'));
        section2.selectAll('.params').attr('disabled', true);
    },
    rendering_params: {}
}

function render_TypoSymbols(rendering_params, new_name) {
    let layer_name = Object.getOwnPropertyNames(user_data)[0];
    let ref_layer_id = _app.layer_to_id.get(layer_name);
    let field = rendering_params.field;
    let layer_to_add = check_layer_name(new_name.length > 0 ? new_name : ['Symbols', field, layer_name].join('_'));
    let ref_selection = document.getElementById(_app.layer_to_id.get(ref_layer_id)).getElementsByTagName('path');
    let nb_ft = ref_selection.length;

    function make_geojson_pt_layer() {
      let result = [];
      for(let i = 0, nb_features = ref_selection.length; i < nb_features; ++i) {
        let ft = ref_selection[i].__data__,
            value = ft.properties[field],
            new_obj = {
                id: i,
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point' }
              };
        if (ft.geometry.type.indexOf('Multi') < 0) {
          new_obj.properties['symbol_field'] = value;
          new_obj.properties['id_parent'] = ft.id;
          new_obj.geometry['coordinates'] = d3.geoCentroid(ft.geometry);
          result.push(new_obj)
        } else {
          let areas = [];
          for(let j = 0; j < ft.geometry.coordinates.length; j++) {
            areas.push(path.area({
              type: ft.geometry.type,
              coordinates: [ft.geometry.coordinates[j]]
            }));
          }
          let ix_max = areas.indexOf(max_fast(areas));
          new_obj.properties['symbol_field'] = value;
          new_obj.properties['id_parent'] = ft.id;
          new_obj.geometry['coordinates'] = d3.geoCentroid({ type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
          result.push(new_obj);
        }
      }
      return {
        type: 'FeatureCollection',
        features: result
      };
    }

    var new_layer_data = make_geojson_pt_layer();
    var layer_id = encodeId(layer_to_add);
    _app.layer_to_id.set(layer_to_add, layer_id);
    _app.id_to_layer.set(layer_id, layer_to_add);
    let context_menu = new ContextMenu(),
        getItems = (self_parent) => [
            { name: i18next.t('app_page.common.edit_style'), action: () => { make_style_box_indiv_symbol(self_parent); }},
            { name: i18next.t('app_page.common.delete'), action: () => {self_parent.style.display = 'none'; }}
    ];

    map.insert('g', '.legend')
        .attrs({ id: layer_id, class: 'layer' })
        .selectAll('image')
        .data(new_layer_data.features).enter()
        .insert('image')
        .attrs( d => {
          let symb = rendering_params.symbols_map.get(d.properties.symbol_field),
              coords = path.centroid(d.geometry);
          return {
            x:coords[0] - symb[1] / 2,
            y: coords[1] - symb[1] / 2,
            width: symb[1],
            height: symb[1],
            'xlink:href': symb[0]
          };
        })
        .on('mouseover', function () { this.style.cursor = 'pointer';})
        .on('mouseout', function () { this.style.cursor = 'initial';})
        .on('contextmenu dblclick', function () {
            context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
            })
        .call(drag_elem_geo);

    create_li_layer_elem(layer_to_add, nb_ft, ['Point', 'symbol'], 'result');

    current_layers[layer_to_add] = {
        n_features: current_layers[layer_name].n_features,
        renderer: 'TypoSymbols',
        symbols_map: rendering_params.symbols_map,
        rendered_field: field,
        is_result: true,
        symbol: 'image',
        ref_layer_name: layer_name,
      };
    handle_legend(layer_to_add);
    zoom_without_redraw();
    switch_accordion_section();
}

function fillMenu_griddedMap(layer) {
    var dialog_content = make_template_functionnality(section2)

    let a = dialog_content.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    a.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' })
      .html(i18next.t('app_page.func_options.common.field'));
    a.insert('select')
      .attrs({ class: 'params', id: 'Gridded_field' });

    let b = dialog_content.append('p').attr('class', 'params_section2');
    b.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.cellsize' })
      .html(i18next.t('app_page.func_options.grid.cellsize'));
    b.insert('input')
      .style('width', '100px')
      .attrs({ type: 'number', class: 'params', id: 'Gridded_cellsize',
              value: 10.0, min: 1.000, max: 7000, step: 'any' });

    let c = dialog_content.append('p').attr('class', 'params_section2');
    c.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.shape' })
      .html(i18next.t('app_page.func_options.grid.shape'));

    var grid_shape = c.insert('select')
        .attrs({ class: 'params i18n', id: 'Gridded_shape' });

    let d = dialog_content.append('p').attr('class', 'params_section2');
    d.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.coloramp' })
      .html(i18next.t('app_page.func_options.grid.coloramp'));
    var col_pal = d.insert('select')
      .attrs({ class: 'params', id: 'Gridded_color_pal' });

    ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn',
    'PuRd', 'RdPu', 'YlGn', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds']
    .forEach( color => { col_pal.append('option').text(color).attr('value', color); });

    [['app_page.func_options.grid.square', 'Square'],
     ['app_page.func_options.grid.diamond', 'Diamond'],
     ['app_page.func_options.grid.hexagon', 'Hexagon']
   ].forEach( shape => {
        grid_shape.append('option').text(i18next.t(shape[0])).attrs({ value: shape[1], 'data-i18n': '[text]' + shape[0] });
    });

    make_layer_name_button(dialog_content, 'Gridded_output_name');
    make_ok_button(dialog_content, 'Gridded_yes', false);
    section2.selectAll('.params').attr('disabled', true);
}


var fields_griddedMap = {
    fill: function(layer) {
        if (!layer) return;

        // let fields = type_col(layer, "number"),
        let fields = getFieldsType('stock', layer),
            field_selec = section2.select('#Gridded_field'),
            output_name = section2.select('#Gridded_output_name'),
            grip_shape = section2.select('#Gridded_shape'),
            ok_button = section2.select('#Gridded_yes');

        fields.forEach(function(field) {
            field_selec.append('option').text(field).attr('value', field); });
        field_selec.on('change', function () {
            output_name.attr('value', ['Gridded', this.value, layer].join('_'));
        });
        ok_button.on('click', () => {
          render_Gridded(
            field_selec.node().value,
            document.getElementById('Gridded_cellsize').value,
            grip_shape.node().value,
            document.getElementById('Gridded_color_pal').value,
            output_name.node().value
          )
        });
        output_name.attr('value', ['Gridded', layer].join('_'));
        document.getElementById('Gridded_cellsize').value = get_first_guess_span('grid');
        section2.selectAll('.params').attr('disabled', null);
    },
    unfill: function () {
        let field_selec = document.getElementById('Gridded_field');
        unfillSelectInput(field_selec);
        section2.selectAll('.params').attr('disabled', true);
    }
}

function render_Gridded(field_n, resolution, cell_shape, color_palette, new_user_layer_name) {
  let layer = Object.getOwnPropertyNames(user_data)[0],
      formToSend = new FormData(),
      var_to_send = {},
      res_test = test_maxmin_resolution(resolution);

  if (res_test) {
      let message = res_test === 'low' ? i18next.t('app_page.common.error_too_low_resolution') : i18next.t('app_page.common.error_too_high_resolution')
      display_error_during_computation(message);
      return;
  }

  if (current_layers[layer].original_fields.has(field_n))
      var_to_send[field_n] = [];
  else
      var_to_send[field_n] = user_data[layer].map(i => i[field_n]);

  formToSend.append('json', JSON.stringify({
    topojson: current_layers[layer].key_name,
    var_name: var_to_send,
    cellsize: resolution * 1000,
    grid_shape: cell_shape
  }));
  xhrequest('POST', 'compute/gridded', formToSend, true)
      .then(data => {
          let options = { result_layer_on_add: true, func_name: 'grid' };
          if (new_user_layer_name.length > 0 &&  /^\w+$/.test(new_user_layer_name)) {
            options['choosed_name'] = new_user_layer_name;
          }
          let rendered_field = field_n + '_densitykm'
          let n_layer_name = add_layer_topojson(data, options);
          if (!n_layer_name)
              return;
          let res_data = result_data[n_layer_name],
              nb_ft = res_data.length,
              opt_nb_class = Math.floor(1 + 3.3 * Math.log10(nb_ft)),
              d_values = [];

          for(let i=0; i < nb_ft; i++) {
              d_values.push(+res_data[i][rendered_field])
          }

          current_layers[n_layer_name].renderer = 'Gridded';
          let disc_result = discretize_to_colors(d_values, 'quantiles', opt_nb_class, color_palette);
          let rendering_params = {
            nb_class: opt_nb_class,
            type: 'quantiles',
            schema: [color_palette],
            breaks: disc_result[2],
            colors: disc_result[3],
            colorsByFeature: disc_result[4],
            renderer: 'Gridded',
            rendered_field: rendered_field,
          };
          render_choro(n_layer_name, rendering_params);
          handle_legend(n_layer_name);
          switch_accordion_section();
      }, error => {
          display_error_during_computation();
          console.log(error);
      });
}


function fillMenu_FlowMap() {
    var dv2 = make_template_functionnality(section2);

    let subtitle = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
    subtitle.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.subtitle1' })
      .html(i18next.t('app_page.func_options.flow.subtitle1'));

    let origin_section = dv2.append('p').attr('class', 'params_section2');
    origin_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.origin_field' })
      .html(i18next.t('app_page.func_options.flow.origin_field'));
    origin_section.insert('select')
      .attrs({ id: 'FlowMap_field_i', class: 'params' });

    let destination_section = dv2.append('p').attr('class', 'params_section2');
    destination_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.destination_field' })
      .html(i18next.t('app_page.func_options.flow.destination_field'));
    destination_section.append('select')
      .attrs({ class: 'params', id: 'FlowMap_field_j' });

    let intensity_section = dv2.append('p').attr('class', 'params_section2');
    intensity_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.intensity_field' })
      .html(i18next.t('app_page.func_options.flow.intensity_field'));
    intensity_section.append('select')
      .attrs({ class: 'params', id: 'FlowMap_field_fij' });

    let discretization_section = dv2.append('p').attr('class', 'params_section2');
    discretization_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.discretization' })
      .html(i18next.t('app_page.func_options.flow.discretization'));
    let disc_type = discretization_section.insert('select')
      .attrs({ class: 'params i18n', id: 'FlowMap_discKind' });

    [
     ['app_page.common.equal_interval', 'equal_interval'],
     ['app_page.common.quantiles', 'quantiles'],
     ['app_page.common.Q6', 'Q6'],
     ['app_page.common.arithmetic_progression', 'arithmetic_progression'],
     ['app_page.common.jenks', 'jenks']
    ].forEach(field => {
            disc_type.append('option').text(i18next.t(field[0])).attrs({ value: field[1], 'data-i18n': '[text]' + field[0] });
        });

    let nb_class_section = dv2.append('p').attr('class', 'params_section2');
    nb_class_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.nb_class' })
      .html(i18next.t('app_page.func_options.flow.nb_class'));
    nb_class_section.insert('input')
      .attrs({ type: 'number', class: 'params', id: 'FlowMap_nbClass', min: 1, max: 33, value: 8 })
      .style('width', '50px');

    dv2.append('p')
      .attrs({ class: 'params', id: 'FlowMap_discTable' });
    dv2.append('p').attr('class', 'params_section2')
      .insert('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.ref_layer_field' })
      .html(i18next.t('app_page.func_options.flow.ref_layer_field'));

    let join_field_section = dv2.append('p').attr('class', 'params_section2');
    join_field_section.append('span')
      .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.join_field' })
      .html(i18next.t('app_page.func_options.flow.join_field'));
    join_field_section.insert('select')
      .attrs({ class: 'params', id: 'FlowMap_field_join' });

    make_layer_name_button(dv2, 'FlowMap_output_name');
    make_ok_button(dv2, 'FlowMap_yes', false);

    d3.selectAll('.params').attr('disabled', true);
}

var fields_FlowMap = {
    fill: function(layer) {
            let self = this,
                field_i = section2.select('#FlowMap_field_i'),
                field_j = section2.select('#FlowMap_field_j'),
                field_fij = section2.select('#FlowMap_field_fij'),
                join_field = section2.select('#FlowMap_field_join'),
                nb_class_input = section2.select('#FlowMap_nbClass'),
                disc_type = section2.select('#FlowMap_discKind'),
                ok_button = section2.select('#FlowMap_yes'),
                uo_layer_name = section2.select('#FlowMap_output_name');

        if (joined_dataset.length > 0
              && document.getElementById('FlowMap_field_i').options.length === 0) {
            let fields = Object.getOwnPropertyNames(joined_dataset[0][0]);
            fields.forEach(function(field) {
                field_i.append('option').text(field).attr('value', field);
                field_j.append('option').text(field).attr('value', field);
                field_fij.append('option').text(field).attr('value', field);
            });
        }
        if (layer) {
            let ref_fields = Object.getOwnPropertyNames(user_data[layer][0]);

            ref_fields.forEach(function(field) {
                join_field.append('option').text(field).attr('value', field);
            });
        }
        if (layer || joined_dataset.length > 0) {
            section2.selectAll('.params').attr('disabled', null);
            uo_layer_name.attr('value', ['Links', layer].join('_'));
        }
        var values_fij;

        field_fij.on('change', function () {
            let name = this.value,
                nclass = nb_class_input.node().value,
                disc = disc_type.node().value,
                min_size = 0.5,
                max_size = 10;
            values_fij = joined_dataset[0].map(obj => +obj[name]);
            make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
        });

        disc_type.on('change', function () {
            let name = field_fij.node().value,
                nclass = nb_class_input.node().value,
                disc = this.value,
                min_size = 0.5,
                max_size = 10;
            if (disc === 'Q6') {
                nclass = 6;
                nb_class_input.attr('value', 6);
            }
            make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
        })

        nb_class_input.on('change', function () {
            let name = field_fij.node().value,
                nclass = this.value,
                disc = disc_type.node().value,
                min_size = 0.5,
                max_size = 10;
            make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
        });

        ok_button.on('click', function () {
          render_FlowMap(
            field_i.node().value,
            field_j.node().value,
            field_fij.node().value,
            join_field.node().value,
            disc_type.node().value,
            uo_layer_name.node().value
          )
        });
    },

    unfill: function () {
        let field_i = document.getElementById('FlowMap_field_i'),
            field_j = document.getElementById('FlowMap_field_j'),
            field_fij = document.getElementById('FlowMap_field_fij'),
            join_field = document.getElementById('FlowMap_field_join');

        for(let i = field_i.childElementCount - 1; i > -1; --i) {
            field_i.removeChild(field_i.children[i]);
            field_j.removeChild(field_j.children[i]);
            field_fij.removeChild(field_fij.children[i]);
        }
        unfillSelectInput(join_field);
        document.getElementById('FlowMap_discTable').innerHTML = '';
        document.getElementById('FlowMap_output_name').value = '';
        section2.selectAll('.params').attr('disabled', true);

    }
};

function render_FlowMap(field_i, field_j, field_fij, name_join_field, disc_type, new_user_layer_name) {
  const ref_layer = Object.getOwnPropertyNames(user_data)[0],
    formToSend = new FormData(),
    join_field_to_send = {};

  const disc_params = fetch_min_max_table_value('FlowMap_discTable'),
    mins = disc_params.mins,
    maxs = disc_params.maxs,
    sizes = disc_params.sizes,
    nb_class = mins.length,
    user_breaks = [].concat(mins, maxs[nb_class - 1]),
    min_size = min_fast(sizes),
    max_size = max_fast(sizes);

  join_field_to_send[name_join_field] = user_data[ref_layer].map(obj => obj[name_join_field]);

  formToSend.append('json', JSON.stringify({
    topojson: current_layers[ref_layer].key_name,
    csv_table: JSON.stringify(joined_dataset[0]),
    field_i: field_i,
    field_j: field_j,
    field_fij: field_fij,
    join_field: join_field_to_send
  }));

  xhrequest('POST', 'compute/links', formToSend, true)
    .then(data => {
      // FIXME : should use the user selected new name if any
      let options = { result_layer_on_add: true, func_name: 'flow' };
      if (new_user_layer_name.length > 0 &&  /^\w+$/.test(new_user_layer_name)) {
          options['choosed_name'] = new_user_layer_name;
      }

      let new_layer_name = add_layer_topojson(data, options);
      if (!new_layer_name) return;
      let layer_to_render = map.select('#' + _app.layer_to_id.get(new_layer_name)).selectAll('path'),
          fij_field_name = field_fij,
          fij_values = result_data[new_layer_name].map(obj => +obj[fij_field_name]),
          nb_ft = fij_values.length,
          serie = new geostats(fij_values);

      if (user_breaks[0] < serie.min()) user_breaks[0] = serie.min();
      if (user_breaks[nb_class] > serie.max()) user_breaks[nb_class] = serie.max();

      serie.setClassManually(user_breaks);

      current_layers[new_layer_name].fixed_stroke = true;
      current_layers[new_layer_name].renderer = 'Links';
      current_layers[new_layer_name].breaks = [];
      current_layers[new_layer_name].linksbyId = [];
      current_layers[new_layer_name].size = [min_size, max_size];
      current_layers[new_layer_name].rendered_field = fij_field_name;
      current_layers[new_layer_name].ref_layer_name = ref_layer;
      current_layers[new_layer_name].min_display = 0;

      let links_byId = current_layers[new_layer_name].linksbyId;

      for (let i = 0; i < nb_ft; ++i) {
        let val = +fij_values[i];
        links_byId.push([i, val, sizes[serie.getClass(val)]]);
      }
      for (let i = 0; i < nb_class; ++i) {
        current_layers[new_layer_name].breaks.push([[user_breaks[i], user_breaks[i+1]], sizes[i]]);
      }
      layer_to_render.style('fill-opacity', 0)
         .style('stroke-opacity', 0.8)
         .style('stroke-width', (d, i) => links_byId[i][2]);
      switch_accordion_section();
      handle_legend(new_layer_name);
    }, error => {
      display_error_during_computation();
      console.log(error);
    });
};

var render_label = function(layer, rendering_params, options) {
  let label_field = rendering_params.label_field;
  let txt_color = rendering_params.color;
  let selected_font = rendering_params.font;
  let font_size = rendering_params.ref_font_size + 'px'
  let new_layer_data = [];
  let layer_to_add = rendering_params.uo_layer_name && rendering_params.uo_layer_name.length > 0
                  ? check_layer_name(rendering_params.uo_layer_name)
                  : check_layer_name('Labels_' + layer);
  let layer_id = encodeId(layer_to_add);
  let pt_position;
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  let nb_ft;
  if (options && options.current_position) {
    pt_position = options.current_position;
  }
  if (options && options.data) {
      new_layer_data = options.data;
      nb_ft = new_layer_data.length;
  } else if (layer) {
    let type_ft_ref = current_layers[layer].symbol || 'path';
    let ref_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName(type_ft_ref);

    nb_ft = ref_selection.length;
    for (let i=0; i<nb_ft; i++) {
      let ft = ref_selection[i].__data__;
      let coords;
      if (ft.geometry.type.indexOf('Multi') === -1) {
        coords = d3.geoCentroid(ft.geometry);
      } else {
        let areas = [];
        for (let j = 0; j < ft.geometry.coordinates.length; j++) {
          areas.push(path.area({
            type: ft.geometry.type,
            coordinates: [ft.geometry.coordinates[j]]
          }));
        }
        let ix_max = areas.indexOf(max_fast(areas));
        coords = d3.geoCentroid({ type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
      }

      new_layer_data.push({
        id: i,
        type: 'Feature',
        properties: {label: ft.properties[label_field], x: coords[0], y: coords[1]},
        geometry: {type: 'Point', coordinates: coords}
      });
      // new_layer_data.push({label: ft.properties[label_field], coords: d3.geoCentroid(ft.geometry)});
    }
  }
  var context_menu = new ContextMenu(),
      getItems = (self_parent) =>  [
          { name: i18next.t('app_page.common.edit_style'), action: () => { make_style_box_indiv_label(self_parent); } },
          { name: i18next.t('app_page.common.delete'), action: () => { self_parent.style.display = 'none'; } }
      ];

  let selection = map.insert('g', '.legend')
    .attrs({ id: layer_id, class: 'layer no_clip' })
    .selectAll('text')
    .data(new_layer_data).enter()
    .insert('text');
  if (pt_position) {
    selection
      .attrs((d,i) => ({
        id: 'Feature_' + i,
        x: pt_position[i][0],
        y: pt_position[i][1],
        'alignment-baseline': 'middle',
        'text-anchor': 'middle' }))
      .styles((d,i) => ({
          display: pt_position[i][2],
          'font-size': pt_position[i][3],
          'font-family': pt_position[i][4],
          fill: pt_position[i][5] }))
      .text((_,i) => pt_position[i][6]);
  } else {
    selection
      .attrs((d,i) => {
        let pt = path.centroid(d.geometry);
        return {
          id: 'Feature_' + i,
          x: pt[0],
          y: pt[1],
          'alignment-baseline': 'middle',
          'text-anchor': 'middle'
        };
      })
      .styles({ 'font-size': font_size, 'font-family': selected_font, fill: txt_color })
      .text(d => d.properties.label);
  }

  selection.on('mouseover', function () { this.style.cursor = 'pointer'; })
      .on('mouseout', function () { this.style.cursor = 'initial'; })
      .on('dblclick contextmenu', function () {
          context_menu.showMenu(d3.event,
                                document.querySelector('body'),
                                getItems(this));
      }).call(drag_elem_geo);;

  create_li_layer_elem(layer_to_add, nb_ft, ['Point', 'label'], 'result');
  current_layers[layer_to_add] = {
    n_features: new_layer_data.length,
    renderer: 'Label',
    symbol: 'text',
    fill_color : txt_color,
    rendered_field: label_field,
    is_result: true,
    ref_layer_name: layer,
    default_size: font_size,
    default_font: selected_font
  };
  zoom_without_redraw();
  return layer_to_add;
}

var render_label_graticule = function(layer, rendering_params, options) {
  let txt_color = rendering_params.color;
  let selected_font = rendering_params.font;
  let font_size = rendering_params.ref_font_size + 'px';
  let position_lat = rendering_params.position_lat || 'bottom';
  let position_lon = rendering_params.position_lon || 'left';
  let new_layer_data = [];
  let layer_to_add = check_layer_name('Labels_Graticule');
  let layer_id = encodeId(layer_to_add);
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  let nb_ft;
  if (options && options.data) {
      new_layer_data = options.data;
      nb_ft = new_layer_data.length;
  } else if (layer) {
      let grat = d3.geoGraticule()
          .step([current_layers['Graticule'].step, current_layers['Graticule'].step]);
      grat = current_layers['Graticule'].extent ? grat.extent(current_layers['Graticule'].extent).lines() : grat.lines();
      nb_ft = grat.length;
      for(let i=0; i<nb_ft; i++) {
          let txt, geometry, line = grat[i];
          if (line.coordinates[0][0] === line.coordinates[1][0]) {
              txt = line.coordinates[0][0];
              geometry = position_lat === 'bottom' ? { type: 'Point', coordinates: line.coordinates[0] } : { type: 'Point', coordinates: line.coordinates[line.length - 1] };
          } else if (line.coordinates[0][1] === line.coordinates[1][1]) {
              txt = line.coordinates[0][1];
              geometry = position_lon === 'left' ? { type: 'Point', coordinates: line.coordinates[0] } : { type: 'Point', coordinates: line.coordinates[line.length - 1] };
          }
          if (txt != undefined) {
            new_layer_data.push({
                id: i,
                type: 'Feature',
                properties: {label: txt},
                geometry: geometry
            });
          }
          // new_layer_data.push({label: ft.properties[label_field], coords: d3.geoCentroid(ft.geometry)});
      }
  }
  var context_menu = new ContextMenu(),
      getItems = (self_parent) =>  [
          { name: i18next.t('app_page.common.edit_style'), action: () => { make_style_box_indiv_label(self_parent); } },
          { name: i18next.t('app_page.common.delete'), action: () => { self_parent.style.display = 'none'; } },
      ];

  map.insert('g', '.legend')
    .attrs({ id: layer_id, class: 'layer no_clip' })
    .selectAll('text')
    .data(new_layer_data).enter()
    .insert('text')
    .attrs( (d,i) => {
      let pt = path.centroid(d.geometry);
      return {
        id: 'Feature_' + i,
        x: pt[0],
        y: pt[1],
        'alignment-baseline': 'middle',
        'text-anchor': 'middle'
      };
    })
    .styles({ 'font-size': font_size, 'font-family': selected_font, fill: txt_color })
    .text(d => d.properties.label)
    .on('mouseover', function () { this.style.cursor = 'pointer'; })
    .on('mouseout', function () { this.style.cursor = 'initial'; })
    .on('dblclick contextmenu', function () {
        context_menu.showMenu(d3.event,
                              document.querySelector('body'),
                              getItems(this)); })
    .call(drag_elem_geo);
  create_li_layer_elem(layer_to_add, nb_ft, ['Point', 'label'], 'result');
  current_layers[layer_to_add] = {
    n_features: new_layer_data.length,
    renderer: 'Label',
    symbol: 'text',
    fill_color: txt_color,
    is_result: true,
    ref_layer_name: layer,
    default_size: font_size,
    default_font: selected_font
  };
  zoom_without_redraw();
  return layer_to_add;
}
