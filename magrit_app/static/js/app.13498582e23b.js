'use strict';

/*
* Memoization functions (naive LRU implementation)
*
*/

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Function.prototype.memoized = function () {
  var max_size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 25;

  this._memo = this._memo || { values: new Map(), stack: [], max_size: max_size };
  var key = JSON.stringify(Array.prototype.slice.call(arguments));
  var cache_value = this._memo.values.get(key);
  if (cache_value !== undefined) {
    return JSON.parse(cache_value);
  }
  cache_value = this.apply(this, arguments);
  this._memo.values.set(key, JSON.stringify(cache_value));
  this._memo.stack.push(key);
  if (this._memo.stack.length >= this._memo.max_size) {
    var old_key = this._memo.stack.shift();
    this._memo.values.delete(old_key);
  }
  return cache_value;
};

Function.prototype.memoize = function () {
  var fn = this;
  return function () {
    return fn.memoized.apply(fn, arguments);
  };
};

/**
* Function setting-up main elements of the interface
*
* Some of the variables created here are put in global/window scope
* as they are gonna be frequently used
*
*/
function setUpInterface(reload_project) {
  // Only ask for confirmation before leaving page if things have been done
  // (layer added, etc..)
  window.addEventListener('beforeunload', beforeUnloadWindow);

  // Remove some layers from the server when user leave the page
  // (ie. result layers are removed but targeted layer and layout layers stay
  // in cache as they have more chance to be added again)
  window.addEventListener('unload', function () {
    var layer_names = Object.getOwnPropertyNames(current_layers).filter(function (name) {
      if (!current_layers[name].hasOwnProperty('key_name')) {
        return 0;
      } else if (current_layers[name].targeted) {
        return 0;
      } else if (current_layers[name].renderer && (current_layers[name].renderer.indexOf('PropSymbols') > -1 || current_layers[name].renderer.indexOf('Dorling') > -1 || current_layers[name].renderer.indexOf('Choropleth') > -1 || current_layers[name].renderer.indexOf('Categorical') > -1)) {
        return 0;
      }
      return 1;
    });
    if (layer_names.length) {
      var formToSend = new FormData();
      layer_names.forEach(function (name) {
        formToSend.append('layer_name', current_layers[name].key_name);
      });
      navigator.sendBeacon('/layers/delete', formToSend);
    }
  }, false);
  var bg = document.createElement('div');
  bg.id = 'overlay';
  bg.style.display = 'none';
  // bg.innerHTML = '<span class="i18n" style="color: white; z-index: 2;margin-top:185px;display: inline-block;" data-i18n="[html]app_page.common.loading_results"></span>' +
  //                '<span style="color: white; z-index: 2;">...<br></span>' +
  //                '<span class="i18n" style="color: white; z-index: 2;display: inline-block;" data-i18n="[html]app_page.common.long_computation"></span><br>' +
  //                '<div class="load-wrapp" style="left: calc(50% - 60px);position: absolute;top: 50px;"><div class="load-1"><div class="line"></div>' +
  //                '<div class="line"></div><div class="line"></div></div></div>';
  bg.innerHTML = '\n<img src="static/img/logo_magrit.png" alt="Magrit" style="left: 15px;position: absolute;" width="auto" height="26">\n<span class="i18n" style="z-index: 2; margin-top:85px; display: inline-block;" data-i18n="[html]app_page.common.loading_results"></span>\n<span style="z-index: 2;">...<br></span>\n<div class="spinner">\n  <div class="rect1"></div>\n  <div class="rect2"></div>\n  <div class="rect3"></div>\n  <div class="rect4"></div>\n  <div class="rect5"></div>\n</div>\n<span class="i18n" style="z-index: 2;display: inline-block; margin-bottom: 20px;" data-i18n="[html]app_page.common.long_computation"></span><br>';
  var btn = document.createElement('button');
  btn.style.fontSize = '13px';
  btn.style.background = '#4b9cdb';
  btn.style.border = '1px solid #298cda';
  btn.style.fontWeight = 'bold';
  btn.className = 'button_st3 i18n';
  btn.setAttribute('data-i18n', '[html]app_page.common.cancel');
  bg.appendChild(btn);
  document.body.appendChild(bg);

  btn.onclick = function () {
    if (_app.xhr_to_cancel) {
      _app.xhr_to_cancel.abort();
      _app.xhr_to_cancel = undefined;
    }
    if (_app.webworker_to_cancel) {
      _app.webworker_to_cancel.onmessage = null;
      _app.webworker_to_cancel.terminate();
      _app.webworker_to_cancel = undefined;
    }
    document.getElementById('overlay').style.display = 'none';
  };

  var bg_drop = document.createElement('div');
  bg_drop.className = 'overlay_drop';
  bg_drop.id = 'overlay_drop';
  bg_drop.style.background = 'black';
  bg_drop.style.opacity = '0.6';
  bg_drop.style.display = 'none';
  bg_drop.style.padding = '10px';
  var inner_div = document.createElement('div');
  inner_div.style.border = 'dashed 2px white';
  inner_div.style.margin = '10px';
  inner_div.style.background = 'rgba(0, 0, 0, 0.33)';
  inner_div.style.borderRadius = '1%';
  inner_div.className = 'overlay_drop';
  var inner_p = document.createElement('p');
  inner_p.style.position = 'fixed';
  inner_p.style.top = '50%';
  inner_p.style.left = '50%';
  inner_p.style.transform = 'translateX(-50%)translateY(-50%)';
  inner_p.style.fontSize = '14px';
  inner_p.style.width = 'auto';
  inner_p.style.bottom = '0px';
  inner_p.style.opacity = '0.85';
  inner_p.style.textAlign = 'center';
  inner_p.style.color = 'white';
  inner_p.style.padding = '0.5em';
  inner_p.innerHTML = 'Drop your file(s) in the window ...';
  inner_div.appendChild(inner_p);
  bg_drop.appendChild(inner_div);
  document.body.appendChild(bg_drop);

  var proj_options = d3.select('.header_options_projection').append('div').attr('id', 'const_options_projection').style('display', 'inline-flex');

  var proj_select2 = proj_options.append('div').attrs({ class: 'styled-select' }).insert('select').attrs({ class: 'i18n', id: 'form_projection2' }).styles({ width: 'calc(100% + 20px)' }).on('change', function () {
    var tmp = this.querySelector('[value="last_projection"]');
    var val = this.value;
    if (val === 'more') {
      this.value = tmp && current_proj_name === tmp.name ? 'last_projection' : current_proj_name;
      createBoxCustomProjection();
      return;
    } else if (val === 'proj4') {
      this.value = tmp && current_proj_name === tmp.name ? 'last_projection' : current_proj_name;
      createBoxProj4();
      return;
    } else if (val === 'last_projection') {
      val = tmp.name;
    } else if (val === 'ConicConformalFrance') {
      val = 'def_proj4';
      _app.last_projection = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    }

    if (val === 'def_proj4') {
      current_proj_name = val;
      change_projection_4(proj4(_app.last_projection));
      makeTooltipProj4(document.getElementById('form_projection2'), _app.last_projection);
    } else {
      current_proj_name = val;
      change_projection(current_proj_name);
    }
  });

  for (var i = 0; i < shortListContent.length; i++) {
    var option = shortListContent[i];
    proj_select2.append('option').attrs({ class: 'i18n', value: option, 'data-i18n': 'app_page.projection_name.' + option }).text(i18next.t('app_page.projection_name.' + option));
  }
  proj_select2.node().value = 'NaturalEarth2';

  var const_options = d3.select('.header_options_right').append('div').attr('id', 'const_options').style('display', 'inline');

  const_options.append('button').attrs({ class: 'const_buttons i18n', id: 'new_project', 'data-i18n': '[tooltip-title]app_page.tooltips.new_project', 'data-placement': 'bottom' }).styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' }).html('<img src="static/img/File_font_awesome_blank.png" width="25" height="auto" alt="Load project file"/>').on('click', function () {
    window.localStorage.removeItem('magrit_project');
    window.removeEventListener('beforeunload', beforeUnloadWindow);
    location.reload();
  });

  const_options.append('button').attrs({ class: 'const_buttons i18n', id: 'load_project', 'data-i18n': '[tooltip-title]app_page.tooltips.load_project_file', 'data-placement': 'bottom' }).styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' }).html('<img src="static/img/Folder_open_alt_font_awesome.png" width="25" height="auto" alt="Load project file"/>').on('click', load_map_template);

  const_options.append('button').attrs({ class: 'const_buttons i18n', id: 'save_file_button', 'data-i18n': '[tooltip-title]app_page.tooltips.save_file', 'data-placement': 'bottom' }).styles({ cursor: 'pointer', background: 'transparent', margin: 'auto' }).html('<img src="static/img/Breezeicons-actions-22-document-save-blank.png" width="25" height="auto" alt="Save project to disk"/>').on('click', save_map_template);

  const_options.append('button').attrs({ class: 'const_buttons i18n', id: 'documentation_link', 'data-i18n': '[tooltip-title]app_page.tooltips.documentation', 'data-placement': 'bottom' }).styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' }).html('<img src="static/img/Documents_icon_-_noun_project_5020_white.png" width="20" height="auto" alt="Documentation"/>').on('click', function () {
    window.open('static/book/index.html', 'DocWindow', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
  });

  const_options.append('button').attrs({ id: 'help_btn',
    class: 'const_buttons i18n',
    'data-i18n': '[tooltip-title]app_page.help_box.tooltip_btn',
    'data-placement': 'bottom' }).styles({ cursor: 'pointer', background: 'transparent' }).html('<img src="static/img/High-contrast-help-browser_blank.png" width="20" height="20" alt="export_load_preferences" style="margin-bottom:3px;"/>').on('click', function () {
    if (document.getElementById('menu_lang')) document.getElementById('menu_lang').remove();
    var click_func = function click_func(window_name, target_url) {
      window.open(target_url, window_name, 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
    };
    var box_content = '<div class="about_content">' + '<p style="font-size: 0.8em; margin-bottom:auto;"><span>' + i18next.t('app_page.help_box.version', { version: _app.version }) + '</span></p>' + '<p><b>' + i18next.t('app_page.help_box.useful_links') + '</b></p>' + '<p><button class="swal2-styled swal2_blue btn_doc">' + i18next.t('app_page.help_box.carnet_hypotheses') + '</button></p>' + '<p><button class="swal2-styled swal2_blue btn_contact">' + i18next.t('app_page.help_box.contact') + '</button></p>' + '<p><button class="swal2-styled swal2_blue btn_gh">' + i18next.t('app_page.help_box.gh_link') + '</button></p>' + '<p style="font-size: 0.8em; margin:auto;"><span>' + i18next.t('app_page.help_box.credits') + '</span></p></div>';
    swal({
      title: i18next.t('app_page.help_box.title'),
      html: box_content,
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: i18next.t('app_page.common.close'),
      animation: 'slide-from-top',
      onOpen: function onOpen() {
        var content = document.getElementsByClassName('about_content')[0];
        var credit_link = content.querySelector('#credit_link');
        credit_link.style.fontWeight = 'bold';
        credit_link.style.cursor = 'pointer';
        credit_link.color = '#000';
        credit_link.onclick = function () {
          window.open('http://riate.cnrs.fr', 'RiatePage', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
        };
        content.querySelector('.btn_doc').onclick = function () {
          window.open('http://magrit.hypotheses.org/', 'Carnet hypotheses', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
        };
        content.querySelector('.btn_contact').onclick = function () {
          window.open('/contact', 'ContactWindow', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
        };
        content.querySelector('.btn_gh').onclick = function () {
          window.open('https://www.github.com/riatelab/magrit', 'GitHubPage', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
        };
      }
    }).then(function (inputValue) {
      return null;
    }, function (dismissValue) {
      return null;
    });
  });

  const_options.append('button').attrs({ id: 'current_app_lang', class: 'const_buttons' }).styles({ color: 'white',
    cursor: 'pointer',
    'font-size': '14px',
    'vertical-align': 'super',
    background: 'transparent',
    'font-weight': 'bold' }).html(i18next.language).on('click', function () {
    if (document.getElementById('menu_lang')) {
      document.getElementById('menu_lang').remove();
    } else {
      (function () {
        var current_lang = i18next.language;
        var other_langs = current_lang === 'en' ? ['es', 'fr'] : current_lang === 'fr' ? ['en', 'es'] : ['en', 'fr'];
        var actions = [{ name: current_lang, callback: change_lang }, { name: other_langs[0], callback: change_lang }, { name: other_langs[1], callback: change_lang }];
        var menu = document.createElement('div');
        menu.style.top = '40px';
        menu.style.right = '0px';
        menu.className = 'context-menu';
        menu.id = 'menu_lang';
        menu.style.minWidth = '30px';
        menu.style.width = '50px';
        menu.style.background = '#000';
        var list_elems = document.createElement('ul');
        menu.appendChild(list_elems);

        var _loop = function _loop(_i2) {
          var item = document.createElement('li'),
              name = document.createElement('span');
          list_elems.appendChild(item);
          item.setAttribute('data-index', _i2);
          item.style.textAlign = 'right';
          item.style.paddingRight = '16px';
          name.className = 'context-menu-item-name';
          name.style.color = 'white';
          name.textContent = actions[_i2].name;
          item.appendChild(name);
          item.onclick = function () {
            actions[_i2].callback();
            menu.remove();
          };
        };

        for (var _i2 = 0; _i2 < actions.length; _i2++) {
          _loop(_i2);
        }
        document.querySelector('body').appendChild(menu);
      })();
    }
  });

  var menu = d3.select('#menu'),
      b_accordion1 = menu.append('button').attr('id', 'btn_s1').attr('class', 'accordion i18n').attr('data-i18n', 'app_page.section1.title'),
      accordion1 = menu.append('div').attr('class', 'panel').attr('id', 'accordion1'),
      b_accordion2_pre = menu.append('button').attr('id', 'btn_s2').attr('class', 'accordion i18n').attr('data-i18n', 'app_page.section2.title'),
      accordion2_pre = menu.append('div').attr('class', 'panel').attr('id', 'accordion2_pre'),
      b_accordion2 = menu.append('button').attr('id', 'btn_s2b').attr('class', 'accordion i18n').style('display', 'none'),
      accordion2 = menu.append('div').attr('class', 'panel').attr('id', 'accordion2b').style('display', 'none'),
      b_accordion3 = menu.append('button').attr('id', 'btn_s3').attr('class', 'accordion i18n').attr('data-i18n', 'app_page.section3.title'),
      accordion3 = menu.append('div').attr('class', 'panel').attr('id', 'accordion3'),
      b_accordion4 = menu.append('button').attr('id', 'btn_s4').attr('class', 'accordion i18n').attr('data-i18n', 'app_page.section4.title'),
      accordion4 = menu.append('div').attr('class', 'panel').attr('id', 'accordion4'),
      b_accordion5 = menu.append('button').attr('id', 'btn_s5').attr('class', 'accordion i18n').attr('data-i18n', 'app_page.section5b.title'),
      accordion5 = menu.append('div').attr('class', 'panel').attr('id', 'accordion5b');

  var section1 = accordion1.append('div').attr('id', 'section1').attr('class', 'i18n').attr('data-i18n', '[tooltip-title]app_page.tooltips.section1').attr('data-placement', 'right');
  window.section2_pre = accordion2_pre.append('div').attr('id', 'section2_pre');
  window.section2 = accordion2.append('div').attr('id', 'section2');
  accordion3.append('div').attrs({ id: 'section3' });
  accordion4.append('div').attr('id', 'section4');
  accordion5.append('div').attr('id', 'section5');

  var dv1 = section1.append('div');
  var dv11 = dv1.append('div').style('width', 'auto');

  dv11.append('img').attrs({ id: 'img_in_geom', class: 'user_panel', src: 'static/img/b/addgeom.png', width: '26', height: '26', alt: 'Geometry layer' }).style('cursor', 'pointer').on('click', click_button_add_layer);

  dv11.append('p').attrs({ id: 'input_geom', class: 'user_panel i18n' }).styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' }).attr('data-i18n', '[html]app_page.section1.add_geom').on('click', click_button_add_layer);

  var dv12 = dv1.append('div');
  dv12.append('img').attrs({ id: 'img_data_ext', class: 'user_panel', src: 'static/img/b/addtabular.png', width: '26', height: '26', alt: 'Additional dataset' }).style('cursor', 'pointer').on('click', click_button_add_layer);

  dv12.append('p').attrs({ id: 'data_ext', class: 'user_panel i18n', 'data-i18n': '[html]app_page.section1.add_ext_dataset' }).styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' }).on('click', click_button_add_layer);

  var div_sample = dv1.append('div').attr('id', 'sample_zone');
  div_sample.append('img').attrs({ id: 'sample_button', class: 'user_panel', src: 'static/img/b/addsample.png', width: '26', height: '26', alt: 'Sample layers' }).style('cursor', 'pointer').on('click', add_sample_layer);

  div_sample.append('span').attrs({ id: 'sample_link', class: 'user_panel i18n' }).styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' }).attr('data-i18n', '[html]app_page.section1.add_sample_data').on('click', add_sample_layer);

  dv1.append('p').attr('id', 'join_section').styles({ 'text-align': 'center', 'margin-top': '2px' }).html('');

  dv1.append('p').styles({ 'text-align': 'center', margin: '5px' }).insert('button').attrs({
    id: 'btn_type_fields',
    class: 'i18n',
    'data-i18n': '[html]app_page.box_type_fields.title',
    disabled: true }).styles({
    cursor: 'pointer',
    'border-radius': '4px',
    border: '1px solid lightgrey',
    padding: '3.5px' }).html(i18next.t('app_page.box_type_fields.title')).on('click', function () {
    var layer_name = Object.getOwnPropertyNames(user_data)[0];
    make_box_type_fields(layer_name);
  });

  make_ico_choice();

  var section3 = d3.select('#section3');

  window.layer_list = section3.append('div').attrs({ class: 'i18n',
    'data-i18n': '[tooltip-title]app_page.tooltips.section3',
    'data-placement': 'right' }).append('ul').attrs({ id: 'sortable', class: 'layer_list' });
  new Sortable(document.getElementById('sortable'), {
    animation: 100,
    onUpdate: function onUpdate(a) {
      // Set the layer order on the map in concordance with the user changes
      // in the layer manager with a pretty rusty 'sorting' algorythm :
      var desired_order = [],
          actual_order = [],
          layers = svg_map.querySelectorAll('.layer');
      var at_end = null;
      if (document.getElementById('info_features').className === 'active') {
        displayInfoOnMove();
        at_end = true;
      }

      for (var _i3 = 0, len_i = a.target.childNodes.length; _i3 < len_i; _i3++) {
        var n = a.target.childNodes[_i3].getAttribute('layer_name');
        desired_order[_i3] = _app.layer_to_id.get(n);
        actual_order[_i3] = layers[_i3].id;
      }
      for (var _i4 = 0, len = desired_order.length; _i4 < len; _i4++) {
        var lyr1 = document.getElementById(desired_order[_i4]),
            lyr2 = document.getElementById(desired_order[_i4 + 1]) || document.getElementById(desired_order[_i4]);
        svg_map.insertBefore(lyr2, lyr1);
      }
      if (at_end) displayInfoOnMove();
    },
    onStart: function onStart(event) {
      document.body.classList.add('no-drop');
    },
    onEnd: function onEnd(event) {
      document.body.classList.remove('no-drop');
    }
  });

  var dv3 = section3.append('div').style('padding-top', '10px').html('');

  dv3.append('img').attrs({ src: 'static/img/b/addsample_t.png',
    class: 'i18n',
    'data-i18n': '[tooltip-title]app_page.tooltips.section3_add_layout_sample',
    'data-placement': 'right' }).styles({ cursor: 'pointer', margin: '2.5px', float: 'right', 'border-radius': '10%' }).on('click', add_layout_layers);
  dv3.append('img').attrs({ src: 'static/img/b/addgeom_t.png',
    id: 'input_layout_geom',
    class: 'i18n',
    'data-i18n': '[tooltip-title]app_page.tooltips.section3_add_layout',
    'data-placement': 'right' }).styles({ cursor: 'pointer', margin: '2.5px', float: 'right', 'border-radius': '10%' }).on('click', click_button_add_layer);

  var section4 = d3.select('#section4');
  var dv4 = section4.append('div').attr('class', 'form-item').style('margin', 'auto').append('ul').styles({ 'list-style': 'outside none none',
    display: 'inline-block',
    padding: '0px',
    width: '100%',
    'margin-top': '0px' });

  var e = dv4.append('li').styles({ margin: '1px', padding: '4px', 'text-align': 'center' });
  e.append('input').attrs({ id: 'title',
    class: 'list_elem_section4 i18n',
    placeholder: '',
    'data-i18n': '[placeholder]app_page.section4.map_title' }).styles({ margin: '0px 0px 0px 3px', width: '160px' }).on('keyup', function () {
    handle_title(this.value);
  });
  e.append('span').styles({ display: 'inline', top: '4px', cursor: 'pointer', 'vertical-align': 'sub' }).html(sys_run_button.replace('submit', 'Title properties')).on('click', handle_title_properties);

  var f = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  f.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.background_color');
  f.append('input').styles({ position: 'absolute', right: '20px', width: '60px', 'margin-left': '15px' }).attrs({ type: 'color', id: 'bg_color', value: '#ffffff', class: 'list_elem_section4 m_elem_right' }).on('change', function () {
    handle_bg_color(this.value);
  });

  var a1 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  a1.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_width');
  a1.append('input').attrs({ id: 'input-width', type: 'number', value: w, class: 'list_elem_section4 m_elem_right' }).on('change', function () {
    var new_width = +this.value;
    if (new_width === 0 || isNaN(new_width)) {
      this.value = w;
      return;
    }
    var ratio_type = document.getElementById('map_ratio_select').value;
    if (ratio_type === 'portrait') {
      h = round_value(new_width / 0.70707, 0);
      canvas_mod_size([new_width, h]);
    } else if (ratio_type === 'landscape') {
      h = round_value(new_width * 0.70707, 0);
      canvas_mod_size([new_width, h]);
    } else {
      canvas_mod_size([new_width, null]);
    }
    document.getElementById('input-height').value = h;
  });

  var a2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  a2.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_height');
  a2.append('input').attrs({ id: 'input-height', type: 'number', value: h, class: 'm_elem_right list_elem_section4' }).on('change', function () {
    var new_height = +this.value;
    if (new_height === 0 || isNaN(new_height)) {
      this.value = h;
      return;
    }
    var ratio_type = document.getElementById('map_ratio_select').value;
    if (ratio_type === 'portrait') {
      w = round_value(new_height * 0.70707, 0);
      canvas_mod_size([w, new_height]);
    } else if (ratio_type === 'landscape') {
      w = round_value(new_height / 0.70707, 0);
      canvas_mod_size([w, new_height]);
    } else {
      canvas_mod_size([null, new_height]);
    }
    document.getElementById('input-width').value = w;
  });

  var b = dv4.append('li').styles({ margin: '1px', padding: '4px 0' });
  b.append('p').attr('class', 'list_elem_section4 i18n').style('padding', '4px').attr('data-i18n', '[html]app_page.section4.map_ratio');
  var ratio_select = b.append('select').attrs({ class: 'list_elem_section4 i18n m_elem_right', id: 'map_ratio_select' });

  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_user').attr('value', 'ratio_user');
  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_landscape').attr('value', 'landscape');
  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_portait').attr('value', 'portrait');
  ratio_select.on('change', function () {
    var map_xy = get_map_xy0();
    var dispo_w = document.innerWidth - map_xy.x - 1;
    var dispo_h = document.innerHeight - map_xy.y - 1;
    var diff_w = dispo_w - w;
    var diff_h = dispo_h - h;
    if (this.value === 'portrait') {
      if (round_value(w / h, 1) === 1.4) {
        var tmp = h;
        h = w;
        w = tmp;
      } else if (diff_h >= diff_w) {
        w = round_value(h * 0.70707, 0);
      } else {
        h = round_value(w / 0.70707, 0);
      }
    } else if (this.value === 'landscape') {
      if (round_value(h / w, 1) === 1.4) {
        var _tmp = h;
        h = w;
        w = _tmp;
      } else if (diff_h <= diff_w) {
        w = round_value(h / 0.70707, 0);
      } else {
        h = round_value(w * 0.70707, 0);
      }
    }
    canvas_mod_size([w, h]);
    document.getElementById('input-width').value = w;
    document.getElementById('input-height').value = h;
    fill_export_png_options(this.value);
  });
  var zoom_prop = svg_map.__zoom;

  var d2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  d2.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.resize_fit');
  d2.append('button').styles({ margin: 0, padding: 0 }).attrs({
    id: 'resize_fit',
    class: 'm_elem_right list_elem_section4 button_st4 i18n',
    'data-i18n': '[html]app_page.common.ok' }).on('click', function () {
    document.getElementById('btn_s4').click();
    window.scrollTo(0, 0);
    w = Math.round(window.innerWidth - 361);
    h = window.innerHeight - 55;
    canvas_mod_size([w, h]);
    document.getElementById('map_ratio_select').value = 'ratio_user';
  });

  var c = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  c.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_center_menu').style('cursor', 'pointer');
  c.append('span').attr('id', 'map_center_menu_ico').style('display', 'inline-table').style('cursor', 'pointer');
  c.on('click', function () {
    var sections = document.getElementsByClassName('to_hide');
    var arg = void 0;
    if (sections[0].style.display === 'none') {
      arg = '';
      document.getElementById('map_center_menu_ico').classList = 'active';
    } else {
      arg = 'none';
      document.getElementById('map_center_menu_ico').classList = '';
    }
    sections[0].style.display = arg;
    sections[1].style.display = arg;
    sections[2].style.display = arg;
    sections[3].style.display = arg;
  });

  var c1 = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  c1.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_center_x');
  c1.append('input').style('width', '80px').attrs({
    id: 'input-center-x',
    class: 'm_elem_right',
    type: 'number',
    value: round_value(zoom_prop.x, 2),
    step: 'any' }).on('change', function () {
    svg_map.__zoom.x = +this.value;
    zoom_without_redraw();
  });

  var c2 = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  c2.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_center_y');

  c2.append('input').attrs({ id: 'input-center-y',
    class: 'list_elem_section4 m_elem_right',
    type: 'number',
    value: round_value(zoom_prop.y, 2),
    step: 'any' }).style('width', '80px').on('change', function () {
    svg_map.__zoom.y = +this.value;
    zoom_without_redraw();
  });

  var d = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  d.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.map_scale_k');
  d.append('input').attrs({ id: 'input-scale-k',
    class: 'list_elem_section4 m_elem_right',
    type: 'number',
    value: round_value(zoom_prop.k * proj.scale(), 2),
    step: 'any' }).style('width', '80px').on('change', function () {
    svg_map.__zoom.k = +this.value / proj.scale();
    zoom_without_redraw();
  });

  var g = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  g.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.canvas_rotation');

  g.append('span').style('float', 'right').html('°');

  g.append('input').attrs({ id: 'canvas_rotation_value_txt',
    class: 'without_spinner',
    type: 'number',
    value: 0,
    min: 0,
    max: 360,
    step: 'any' }).styles({ width: '30px', 'margin-left': '10px', float: 'right', 'font-size': '11.5px' }).on('change', function () {
    var val = +this.value,
        old_value = document.getElementById('form_rotate').value;
    if (isNaN(val) || val < -361) {
      this.value = old_value;
      return;
    } else if (val < 0 && val > -361) {
      this.value = 360 + val;
    } else if (val > 360) {
      this.value = 360;
    } else {
      // Should remove trailing zeros (right/left) if any :
      this.value = +this.value;
    }
    rotate_global(this.value);
    document.getElementById('form_rotate').value = this.value;
  });

  g.append('input').attrs({ type: 'range', id: 'form_rotate', min: 0, max: 360, step: 1 }).styles({ width: '80px', margin: '0px 10px 5px 15px', float: 'right' }).on('input', function () {
    rotate_global(this.value);
    document.getElementById('canvas_rotation_value_txt').value = this.value;
  });

  var g2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  g2.append('p').attr('class', 'list_elem_section4 i18n').attr('data-i18n', '[html]app_page.section4.autoalign_features');
  g2.append('input').styles({ margin: 0, padding: 0 }).attrs({ id: 'autoalign_features',
    type: 'checkbox',
    class: 'm_elem_right list_elem_section4 i18n' }).on('change', function () {
    _app.autoalign_features = this.checked;
  });

  var _i = dv4.append('li').styles({ 'text-align': 'center' });
  _i.insert('p').styles({ clear: 'both', display: 'block', margin: 0 }).attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section4.layout_features' });
  var p1 = _i.insert('p').style('display', 'inline-block');
  p1.insert('span').insert('img').attrs({ id: 'btn_arrow', src: 'static/img/layout_icons/arrow-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.arrow' }).on('click', function () {
    return add_layout_feature('arrow');
  });
  p1.insert('span').insert('img').attrs({ id: 'btn_text_annot', src: 'static/img/layout_icons/text-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.text_annot' }).on('click', function () {
    return add_layout_feature('text_annot');
  });
  if (!window.isIE) {
    p1.insert('span').insert('img').attrs({ id: 'btn_symbol', src: 'static/img/layout_icons/symbols-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.symbol' }).on('click', function () {
      return add_layout_feature('symbol');
    });
  }
  p1.insert('span').insert('img').attrs({ id: 'btn_rectangle', src: 'static/img/layout_icons/rect-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.rectangle' }).on('click', function () {
    return add_layout_feature('rectangle');
  });
  p1.insert('span').insert('img').attrs({ id: 'btn_ellipse', src: 'static/img/layout_icons/ellipse-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.ellipse' }).on('click', function () {
    return add_layout_feature('ellipse');
  });

  var p2 = _i.insert('p').style('display', 'inline-block');
  p2.insert('span').insert('img').attrs({ id: 'btn_graticule', src: 'static/img/layout_icons/graticule-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.graticule' }).on('click', function () {
    return add_layout_feature('graticule');
  });
  p2.insert('span').insert('img').attrs({ id: 'btn_north', src: 'static/img/layout_icons/north-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.north_arrow' }).on('click', function () {
    return add_layout_feature('north_arrow');
  });
  p2.insert('span').insert('img').attrs({ id: 'btn_scale', src: 'static/img/layout_icons/scale.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.scale' }).on('click', function () {
    return add_layout_feature('scale');
  });
  p2.insert('span').insert('img').attrs({ id: 'btn_sphere', src: 'static/img/layout_icons/sphere-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.sphere' }).on('click', function () {
    return add_layout_feature('sphere');
  });

  add_simplified_land_layer();

  var section5b = d3.select('#section5');
  var dv5b = section5b.append('div').attr('class', 'form-item');

  var type_export = dv5b.append('p');
  type_export.append('span').attr('class', 'i18n').attr('data-i18n', '[html]app_page.section5b.type');
  var select_type_export = type_export.append('select').attrs({ id: 'select_export_type', class: 'm_elem_right' }).on('change', function () {
    var type = this.value,
        export_filename = document.getElementById('export_filename');
    if (type === 'svg') {
      document.getElementById('export_options_geo').style.display = 'none';
      document.getElementById('export_options_png').style.display = 'none';
      export_filename.value = 'export.svg';
      export_filename.style.display = '';
      export_filename.previousSibling.style.display = '';
    } else if (type === 'png') {
      document.getElementById('export_options_geo').style.display = 'none';
      document.getElementById('export_options_png').style.display = '';
      export_filename.value = 'export.png';
      export_filename.style.display = '';
      export_filename.previousSibling.style.display = '';
    } else if (type === 'geo') {
      document.getElementById('export_options_png').style.display = 'none';
      document.getElementById('export_options_geo').style.display = '';
      export_filename.style.display = 'none';
      export_filename.previousSibling.style.display = 'none';
    }
  });

  select_type_export.append('option').text('SVG').attr('value', 'svg');
  select_type_export.append('option').text('PNG').attr('value', 'png');
  select_type_export.append('option').text('GEO').attr('value', 'geo');

  var export_png_options = dv5b.append('p').attr('id', 'export_options_png').style('display', 'none');

  export_png_options.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.format' });

  var select_size_png = export_png_options.append('select').attrs({ id: 'select_png_format', class: 'm_elem_right' });
  fill_export_png_options('user_defined');

  select_size_png.on('change', function () {
    var value = this.value,
        unit = value === 'web' ? ' (px)' : ' (cm)',
        in_h = document.getElementById('export_png_height'),
        in_w = document.getElementById('export_png_width');
    if (value === 'web') {
      in_h.value = h;
      in_w.value = w;
    } else if (value === 'user_defined') {
      in_h.value = Math.round(h / 118.11 * 10) / 10;
      in_w.value = Math.round(w / 118.11 * 10) / 10;
    } else if (value === 'A4_landscape') {
      in_h.value = 21.0;
      in_w.value = 29.7;
    } else if (value === 'A4_portrait') {
      in_h.value = 29.7;
      in_w.value = 21.0;
    } else if (value === 'A3_landscape') {
      in_h.value = 42.0;
      in_w.value = 29.7;
    } else if (value === 'A3_portrait') {
      in_h.value = 29.7;
      in_w.value = 42.0;
    } else if (value === 'A5_landscape') {
      in_h.value = 14.8;
      in_w.value = 21.0;
    } else if (value === 'A5_portrait') {
      in_h.value = 21.0;
      in_w.value = 14.8;
    }
    document.getElementById('export_png_width_txt').innerHTML = unit;
    document.getElementById('export_png_height_txt').innerHTML = unit;
    if (value.indexOf('portrait') > -1 || value.indexOf('landscape') > -1) {
      in_h.disabled = 'disabled';
      in_w.disabled = 'disabled';
    } else {
      in_h.disabled = undefined;
      in_w.disabled = undefined;
    }
  });

  var exp_a = export_png_options.append('p');
  exp_a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.width' });

  exp_a.append('input').style('width', '60px').attrs({ id: 'export_png_width', class: 'm_elem_right', type: 'number', step: 0.1, value: w }).on('change', function () {
    var ratio = h / w,
        export_png_height = document.getElementById('export_png_height');
    export_png_height.value = Math.round(+this.value * ratio * 10) / 10;
  });

  exp_a.append('span').attr('id', 'export_png_width_txt').html(' (px)');

  var exp_b = export_png_options.append('p');
  exp_b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.height' });

  exp_b.append('input').style('width', '60px').attrs({ id: 'export_png_height', class: 'm_elem_right', type: 'number', step: 0.1, value: h }).on('change', function () {
    var ratio = h / w,
        export_png_width = document.getElementById('export_png_width');
    export_png_width.value = Math.round(+this.value / ratio * 10) / 10;
  });

  exp_b.append('span').attr('id', 'export_png_height_txt').html(' (px)');

  var export_name = dv5b.append('p');
  export_name.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.filename' });

  export_name.append('input').attrs({ id: 'export_filename', class: 'm_elem_right', type: 'text' });

  var export_geo_options = dv5b.append('p').attr('id', 'export_options_geo').style('display', 'none');

  var geo_a = export_geo_options.append('p').style('margin-bottom', '0');
  geo_a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_layer' });

  var selec_layer = export_geo_options.insert('select').styles({ position: 'sticky', float: 'right' }).attrs({ id: 'layer_to_export', class: 'i18n m_elem_right' });

  var geo_b = export_geo_options.append('p').styles({ clear: 'both' }); // 'margin-top': '35px !important'
  geo_b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_datatype' });
  var selec_type = geo_b.insert('select').attrs({ id: 'datatype_to_use', class: 'i18n m_elem_right' }).style('margin-top', '5px');

  export_geo_options.append('p').style('margin', 'auto').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_projection' });
  var geo_c = export_geo_options.append('p').style('margin', 'auto');
  var selec_projection = geo_c.insert('select').styles({ position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px' }).attrs({ id: 'projection_to_use', disabled: true, class: 'i18n' });

  var proj4_input = export_geo_options.append('p').style('margin', 'auto').insert('input').attrs({ id: 'proj4str' }).styles({ display: 'none', width: '275px', position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px' }).on('keyup', function () {
    ok_button.disabled = this.value.length === 0 ? 'true' : '';
  });

  ['GeoJSON', 'TopoJSON', 'ESRI Shapefile', 'GML', 'KML'].forEach(function (name) {
    selec_type.append('option').attr('value', name).text(name);
  });

  [['app_page.section5b.wgs84', 'epsg:4326'], ['app_page.section5b.web_mercator', 'epsg:3857'], ['app_page.section5b.laea_europe', 'epsg:3035'], ['app_page.section5b.usa_albers', '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs'], ['app_page.section5b.british_national_grid', 'epsg:27700'], ['app_page.section5b.lambert93', 'epsg:2154'], ['app_page.section5b.eckert_4', '+proj=eck4 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs '], ['app_page.section5b.proj4_prompt', 'proj4string']].forEach(function (projection) {
    selec_projection.append('option').attrs({ class: 'i18n', value: projection[1], 'data-i18n': projection[0] }).text(i18next.t(projection[0]));
  });

  selec_type.on('change', function () {
    if (this.value === 'TopoJSON' || this.value === 'KML' || this.value === 'GeoJSON') {
      selec_projection.node().options.selectedIndex = 0;
      selec_projection.attr('disabled', true);
      ok_button.disabled = '';
    } else {
      selec_projection.attr('disabled', null);
    }
  });

  selec_projection.on('change', function () {
    if (this.value === 'proj4string') {
      proj4_input.style('display', 'initial');
      if (proj4_input.node().value === '' || proj4_input.node().value === undefined) {
        ok_button.disabled = 'true';
      }
    } else {
      proj4_input.style('display', 'none');
      ok_button.disabled = '';
    }
  });
  var ok_button = dv5b.append('p').style('float', 'left').append('button').attrs({ id: 'export_button_section5b', class: 'i18n button_st4', 'data-i18n': '[html]app_page.section5b.export_button' }).on('click', function () {
    var type_exp = document.getElementById('select_export_type').value,
        exp_name = document.getElementById('export_filename').value;
    if (type_exp === 'svg') {
      export_compo_svg(exp_name);
    } else if (type_exp === 'geo') {
      var layer_name = document.getElementById('layer_to_export').value,
          type = document.getElementById('datatype_to_use').value,
          _proj2 = document.getElementById('projection_to_use').value,
          proj4value = document.getElementById('proj4str').value;
      export_layer_geo(layer_name, type, _proj2, proj4value);
    } else if (type_exp === 'png') {
      var exp_type = document.getElementById('select_png_format').value,
          ratio = void 0;
      if (exp_type === 'web') {
        ratio = +document.getElementById('export_png_height').value / +h;
      } else {
        exp_type = 'paper';
        ratio = +document.getElementById('export_png_height').value * 118.11 / +h;
      }
      _export_compo_png(exp_type, ratio, exp_name);
    }
  });

  // Zoom-in, Zoom-out, Info, Hand-Move and RectZoom buttons (on the top of the map) :
  var lm = map_div.append('div').attr('class', 'light-menu').styles({ position: 'absolute', right: '0px', bottom: '0px' });

  var lm_buttons = [{ id: 'zoom_out', i18n: '[tooltip-title]app_page.lm_buttons.zoom-', tooltip_position: 'left', class: 'zoom_button i18n', html: '-' }, { id: 'zoom_in', i18n: '[tooltip-title]app_page.lm_buttons.zoom+', tooltip_position: 'left', class: 'zoom_button i18n', html: '+' }, { id: 'info_button', i18n: '[tooltip-title]app_page.lm_buttons.i', tooltip_position: 'left', class: 'info_button i18n', html: 'i' }, { id: 'brush_zoom_button', i18n: '[tooltip-title]app_page.lm_buttons.zoom_rect', tooltip_position: 'left', class: 'brush_zoom_button i18n', html: '<img src="static/img/Inkscape_icons_zoom_fit_selection_blank.png" width="18" height="18" alt="Zoom_select"/>' }, { id: 'hand_button', i18n: '[tooltip-title]app_page.lm_buttons.hand_button', tooltip_position: 'left', class: 'hand_button active i18n', html: '<img src="static/img/Twemoji_1f513.png" width="18" height="18" alt="Hand_closed"/>' }];

  var selec = lm.selectAll('input').data(lm_buttons).enter().append('p').style('margin', 'auto').insert('button').attrs(function (elem) {
    return {
      'data-placement': elem.tooltip_position,
      class: elem.class,
      'data-i18n': elem.i18n,
      id: elem.id };
  }).html(function (elem) {
    return elem.html;
  });

  // Trigger actions when buttons are clicked and set-up the initial view :
  d3.selectAll('.zoom_button').on('click', zoomClick);
  document.getElementById('info_button').onclick = displayInfoOnMove;
  document.getElementById('hand_button').onclick = handle_click_hand;
  document.getElementById('brush_zoom_button').onclick = handleZoomRect;

  // Already append the div for displaying information on features,
  // setting it currently unactive until it will be requested :
  d3.select('body').append('div').attr('id', 'info_features').classed('active', false).style('display', 'none').html('');

  accordionize('.accordion');
  document.getElementById('btn_s1').dispatchEvent(new MouseEvent('click'));
  prepare_drop_section();

  if (reload_project) {
    var url = void 0;
    if (reload_project.startsWith('http')) {
      url = reload_project;
    } else {
      url = 'https://gist.githubusercontent.com/' + reload_project + '/raw/';
    }
    xhrequest('GET', url, undefined, true).then(function (data) {
      apply_user_preferences(data);
    });
  } else {
    // Check if there is a project to reload in the localStorage :
    var last_project = window.localStorage.getItem('magrit_project');
    if (last_project && last_project.length && last_project.length > 0) {
      swal({ title: '',
        // text: i18next.t('app_page.common.resume_last_project'),
        allowOutsideClick: false,
        allowEscapeKey: false,
        type: 'question',
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: i18next.t('app_page.common.new_project'),
        cancelButtonText: i18next.t('app_page.common.resume_last')
      }).then(function () {
        // If we don't want to resume from the last project, we can
        // remove it :
        window.localStorage.removeItem('magrit_project');
        // Indicate that that no layer have been added for now :*
        _app.first_layer = true;
      }, function (dismiss) {
        apply_user_preferences(last_project);
      });
    } else {
      // Indicate that that no layer have been added for now :*
      _app.first_layer = true;
    }
  }
  // Set the properties for the notification zone :
  alertify.set('notifier', 'position', 'bottom-left');
}

function encodeId(s) {
  if (s === '') return 'L_';
  return 'L_' + s.replace(/[^a-zA-Z0-9_-]/g, function (match) {
    return '_' + match[0].charCodeAt(0).toString(16) + '_';
  });
}

function bindTooltips() {
  var dataAttr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'tooltip-title';

  // bind the mains tooltips
  var tooltips_elem = document.querySelectorAll('[' + dataAttr + ']');
  for (var i = tooltips_elem.length - 1; i > -1; i--) {
    new Tooltip(tooltips_elem[i], {
      dataAttr: dataAttr,
      animation: 'slideNfade',
      duration: 50,
      delay: 100,
      container: document.getElementById('twbs')
    });
  }
}

function make_eye_button(state) {
  if (state === 'open') {
    var eye_open = document.createElement('img');
    eye_open.setAttribute('src', 'static/img/b/eye_open.png');
    eye_open.setAttribute('class', 'active_button i18n');
    eye_open.setAttribute('id', 'eye_open');
    eye_open.setAttribute('width', 17);
    eye_open.setAttribute('height', 17);
    eye_open.setAttribute('alt', 'Visible');
    return eye_open;
  } else if (state === 'closed') {
    var eye_closed = document.createElement('img');
    eye_closed.setAttribute('src', 'static/img/b/eye_closed.png');
    eye_closed.setAttribute('class', 'active_button i18n');
    eye_closed.setAttribute('id', 'eye_closed');
    eye_closed.setAttribute('width', 17);
    eye_closed.setAttribute('height', 17);
    eye_closed.setAttribute('alt', 'Not visible');
    return eye_closed;
  }
}

function change_lang() {
  var new_lang = this.name;
  if (new_lang !== i18next.language) {
    docCookies.setItem('user_lang', new_lang, 31536e3, '/');
    i18next.changeLanguage(new_lang, function () {
      localize('.i18n');
      bindTooltips();
    });
    document.getElementById('current_app_lang').innerHTML = new_lang;
    var menu = document.getElementById('menu_lang');
    if (menu) menu.remove();
  }
}

function make_ico_choice() {
  var list_fun_ico = ['prop.png', 'choro.png', 'typo.png', 'choroprop.png', 'proptypo.png', 'grid.png', 'cartogram.png', 'smooth.png', 'discont.png', 'typosymbol.png', 'flow.png', 'two_stocks.png'];

  var function_panel = section2_pre.append('div').attr('id', 'list_ico_func');

  var _loop2 = function _loop2(i, len_i) {
    var ico_name = list_fun_ico[i],
        func_name = ico_name.split('.')[0],
        func_desc = get_menu_option(func_name).desc,
        margin_value = '5px 16px';
    // margin_value = i == 8 ? '5px 16px 5px 55px' : '5px 16px';
    function_panel.insert('img').styles({ margin: margin_value, cursor: 'pointer', width: '50px', float: 'left', 'list-style': 'none' }).attrs({
      class: 'i18n',
      'data-i18n': ['[title]app_page.func_description.', func_name].join(''),
      src: ['static/img/func_icons2/', ico_name].join(''),
      id: 'button_' + func_name }).on('click', function () {
      // Do some clean-up related to the previously displayed options :
      if (window.fields_handler) {
        if (this.classList.contains('active')) {
          switch_accordion_section('btn_s2b');
          return;
        } else {
          clean_menu_function();
        }
      }

      document.getElementById('accordion2b').style.display = '';
      // Get the function to fill the menu with the appropriate options (and do it):
      _app.current_functionnality = get_menu_option(func_name);
      var make_menu = window[_app.current_functionnality.menu_factory];
      window.fields_handler = window[_app.current_functionnality.fields_handler];
      make_menu();

      // Replace the title of the section:
      var selec_title = document.getElementById('btn_s2b');
      selec_title.innerHTML = '<span class="i18n" data-i18n="app_page.common.representation">' + i18next.t('app_page.common.representation') + '</span><span> : </span><span class="i18n" data-i18n="app_page.func_title.' + _app.current_functionnality.name + '">' + i18next.t('app_page.func_title.' + _app.current_functionnality.name) + '</span>';
      selec_title.style.display = '';

      // Don't fill the menu / don't highlight the icon if the type of representation is not authorizhed :
      if (this.style.filter !== 'grayscale(100%)') {
        this.classList.add('active');
        // Highlight the icon of the selected functionnality :
        this.style.filter = 'invert(100%) saturate(200%)';

        // Fill the field of the functionnality with the field
        // of the targeted layer if already uploaded by the user :
        if (_app.targeted_layer_added) {
          var target_layer = Object.getOwnPropertyNames(user_data)[0];
          fields_handler.fill(target_layer);
        }

        // Specific case for flow/link functionnality as we are also
        // filling the fields with data from the uploaded tabular file if any :
        if (func_name === 'flow' && joined_dataset) {
          fields_handler.fill();
        }
      }
      switch_accordion_section('btn_s2b');
    });
  };

  for (var i = 0, len_i = list_fun_ico.length; i < len_i; i++) {
    _loop2(i, len_i);
  }
}

var proj = d3.geoNaturalEarth2().scale(1).translate([0, 0]);
var path = d3.geoPath().projection(proj).pointRadius(4);
var t = proj.translate();
var s = proj.scale();
var current_proj_name = 'NaturalEarth2';
var zoom = d3.zoom().on('zoom', zoom_without_redraw);
var w = Math.round(window.innerWidth - 361);
var h = window.innerHeight - 55;
/*
A bunch of global variable, storing oftently reused informations :
    - user_data[layer_name] : will be an Array of Objects containing data for each features of the targeted layer
            (+ the joined features if a join is done)
    - result_data[layer_name] : the same but for any eventual result layers (like Stewart, gridded, etc.)
    - joined_dataset : the joined dataset (read with d3.csv then pushed in the first slot of this array)
    - field_join_map : an array containg mapping between index of geom layer and index of ext. dataset
    - current_layers : the main object describing **all** the layers on the map (incunding detailed (ie. by features) styling properties if needed)
*/

var user_data = {};
var result_data = {};
var joined_dataset = [];
var field_join_map = [];
var current_layers = {};
var dataset_name = void 0;
var canvas_rotation_value = void 0;
var map_div = d3.select('#map');
var pos_lgds_elem = new Map();

// The 'map' (so actually the `map` variable is a reference to the main `svg` element on which we are drawing)
var map = map_div.styles({ width: w + 'px', height: h + 'px' }).append('svg').attrs({ id: 'svg_map', width: w, height: h }).style('background-color', 'rgba(255, 255, 255, 0)').style('position', 'absolute').on('contextmenu', function (event) {
  d3.event.preventDefault();
}).call(zoom);

var svg_map = map.node();
var defs = map.append('defs');

var _app = {
  to_cancel: undefined,
  targeted_layer_added: false,
  current_functionnality: undefined,
  layer_to_id: new Map([['World', encodeId('World')], ['Graticule', encodeId('Graticule')]]),
  id_to_layer: new Map([[encodeId('World'), 'World'], [encodeId('Graticule'), 'Graticule']]),
  version: document.querySelector('#header').getAttribute('v'),
  existing_lang: ['en', 'es', 'fr'],
  custom_palettes: new Map()
};

// A bunch of references to the buttons used in the layer manager
// and some mapping to theses reference according to the type of geometry :
var button_trash = ' <img src="static/img/Trash_font_awesome.png" id="trash_button" width="15" height="15" alt="trash_button"/>',
    button_legend = ' <img src="static/img/qgis_legend.png" id="legend_button" width="17" height="17" alt="legend_button"/>',
    button_zoom_fit = ' <img src="static/img/Inkscape_icons_zoom_fit_page.png" id="zoom_fit_button" width="16" height="16" alt="zoom_button"/></button>',
    button_table = ' <img src="static/img/dataset.png" id="browse_data_button" width="16" height="16" alt="dataset_button"/></button>',
    button_type = new Map([['Point', '<img src="static/img/type_geom/dot.png" class="ico_type" width="17" height="17" alt="Point"/>'], ['Line', '<img src="static/img/type_geom/line.png" class="ico_type" width="17" height="17" alt="Line"/>'], ['Polygon', '<img src="static/img/type_geom/poly.png" class="ico_type" width="17" height="17" alt="Polygon"/>']]);

var button_result_type = new Map([['flow', '<img src="static/img/type_geom/layer_flow.png" class="ico_type" width="17" height="17" alt="flow"/>'], ['symbol', '<img src="static/img/type_geom/layer_symbol.png" class="ico_type" width="17" height="17" alt="symbol"/>'], ['grid', '<img src="static/img/type_geom/layer_grid.png" class="ico_type" width="17" height="17" alt="grid"/>'], ['propchoro', '<img src="static/img/type_geom/layer_propchoro.png" class="ico_type" width="17" height="17" alt="propchoro"/>'], ['typo', '<img src="static/img/type_geom/layer_typo.png" class="ico_type" width="17" height="17" alt="typo"/>'], ['discont', '<img src="static/img/type_geom/layer_disc.png" class="ico_type" width="17" height="17" alt="discont"/>'], ['cartogram', '<img src="static/img/type_geom/layer_cartogram.png" class="ico_type" width="17" height="17" alt="cartogram"/>'], ['label', '<img src="static/img/type_geom/layer_label.png" class="ico_type" width="17" height="17" alt="label"/>'], ['choro', '<img src="static/img/type_geom/layer_choro.png" class="ico_type" width="17" height="17" alt="choro"/>'], ['smooth', '<img src="static/img/type_geom/layer_smooth.png" class="ico_type" width="17" height="17" alt="smooth"/>'], ['prop', '<img src="static/img/type_geom/layer_prop.png" class="ico_type" width="17" height="17" alt="prop"/>'], ['waffle', '<img src="static/img/type_geom/layer_waffle.png" class="ico_type" width="17" height="17" alt="waffle"/>']]);

var eye_open0 = '<img src="static/img/b/eye_open.png" class="active_button" id="eye_open"  width="17" height="17" alt="Visible"/>';

// Reference to the sys run button already in two requested sizes are they are called many times :
var sys_run_button = '<img src="static/img/High-contrast-system-run.png" width="22" height="22" style="vertical-align: inherit;" alt="submit"/>';
var sys_run_button_t2 = '<img src="static/img/High-contrast-system-run.png" class="style_target_layer" width="18" height="18" alt="Layer_rendering" style="float:right;"/>';

// Shortcut to the name of the methods offered by geostats library:
var discretiz_geostats_switch = new Map([['jenks', 'getJenks'], ['equal_interval', 'getEqInterval'],
// ['std_dev', 'getStdDeviation'],
['quantiles', 'getQuantile'], ['arithmetic_progression', 'getArithmeticProgression'], ['Q6', 'getBreaksQ6'], ['geometric_progression', 'getGeometricProgression']]);

// Reference to the available fonts that the user could select :
var available_fonts = [['Arial', 'Arial,Helvetica,sans-serif'], ['Arial Black', 'Arial Black,Gadget,sans-serif'], ['Arimo', 'Arimo,sans-serif'], ['Baloo Bhaina', 'Baloo Bhaina,sans-serif'], ['Bitter', 'Bitter,sans-serif'], ['Dosis', 'Dosis,sans-serif'], ['Roboto', 'Roboto,sans-serif'], ['Lobster', 'Lobster,sans-serif'], ['Impact', 'Impact,Charcoal,sans-serif'], ['Inconsolata', 'Inconsolata,sans-serif'], ['Georgia', 'Georgia,serif'], ['Lobster', 'Lobster,serif'], ['Lucida', 'Lucida Sans Unicode,Lucida Grande,sans-serif'], ['Palatino', 'Palatino Linotype,Book Antiqua,Palatino,serif'], ['Roboto', 'Roboto'], ['Scope One', 'Scope One'], ['Tahoma', 'Tahoma,Geneva,sans-serif'], ['Trebuchet MS', 'Trebuchet MS,elvetica,sans-serif'], ['Verdana', 'Verdana,Geneva,sans-serif']];

// This variable have to be (well, we could easily do this in an other way!) up to date
// with the style-fonts.css file as we are using their order to lookup for their definition
// the .css file.
var customs_fonts = ['Arimo', 'Baloo Bhaina', 'Bitter', 'Dosis', 'Inconsolata', 'Lobster', 'Roboto', 'Scope One'];

function parseQuery(search) {
  var args = search.substring(1).split('&');
  var argsParsed = {};
  var arg = void 0,
      kvp = void 0,
      key = void 0,
      value = void 0;
  for (var i = 0; i < args.length; i++) {
    arg = args[i];
    if (arg.indexOf('=') === -1) {
      argsParsed[decodeURIComponent(arg).trim()] = true;
    } else {
      kvp = arg.split('=');
      key = decodeURIComponent(kvp[0]).trim();
      value = decodeURIComponent(kvp[1]).trim();
      argsParsed[key] = decodeURIComponent(kvp[1]).trim();
    }
  }
  return argsParsed;
}

(function () {
  var lang = docCookies.getItem('user_lang') || window.navigator.language.split('-')[0];
  var params = {};
  document.querySelector('noscript').remove();
  window.isIE = function () {
    return (/MSIE/i.test(navigator.userAgent) || /Trident\/\d./i.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent)
    );
  }();
  // window.isOldMS_Firefox = (() => (/Firefox/i.test(navigator.userAgent)
  //   && (/Windows NT 6.0/i.test(navigator.userAgent)
  //       || /Windows NT 6.1/i.test(navigator.userAgent))) ? true : false
  // )();
  if (window.location.search) {
    var parsed_querystring = parseQuery(window.location.search);
    params.reload = parsed_querystring.reload;
    if (typeof history.replaceState !== 'undefined') {
      // replaceState should avoid creating a new entry on the history
      var obj = { Page: window.location.search, Url: window.location.pathname };
      history.replaceState(obj, obj.Page, obj.Url);
    }
  }

  lang = _app.existing_lang.indexOf(lang) > -1 ? lang : 'en';
  i18next.use(i18nextXHRBackend).init({
    debug: true,
    lng: lang,
    fallbackLng: _app.existing_lang[0],
    backend: {
      loadPath: 'static/locales/{{lng}}/translation.13498582e23b.json'
    }
  }, function (err, tr) {
    if (err) {
      throw err;
    } else {
      window.localize = locI18next.init(i18next);
      setUpInterface(params.reload);
      localize('.i18n');
      bindTooltips();
    }
  });
})();

function up_legends() {
  var legend_features = svg_map.querySelectorAll('.legend');
  for (var i = 0; i < legend_features.length; i++) {
    svg_map.appendChild(legend_features[i], null);
  }
}

// To bind the set of small buttons
// (trash icon, paint icon, active/deactive visibility, info tooltip, etc..)
// which are on each feature representing a layer in the layer manager
// (the function is called each time that a new feature is put in this layer manager)
function binds_layers_buttons(layer_name) {
  var layer_id = _app.layer_to_id.get(layer_name);
  var sortable_elem = d3.select('#sortable').select('.' + layer_id);
  sortable_elem.on('dblclick', function () {
    handle_click_layer(layer_name);
  });
  sortable_elem.on('contextmenu', function () {
    d3.event.preventDefault();
  });
  sortable_elem.select('#trash_button').on('click', function () {
    remove_layer(layer_name);
  });
  sortable_elem.select('.active_button').on('click', function () {
    handle_active_layer(layer_name);
  });
  sortable_elem.select('.style_button').on('click', function () {
    handle_click_layer(layer_name);
  });
  sortable_elem.select('.style_target_layer').on('click', function () {
    handle_click_layer(layer_name);
  });
  sortable_elem.select('#legend_button').on('click', function () {
    handle_legend(layer_name);
  });
  sortable_elem.select('#browse_data_button').on('click', function () {
    boxExplore2.create(layer_name);
  });
  sortable_elem.select('#zoom_fit_button').on('click', function () {
    center_map(layer_name);
    zoom_without_redraw();
  });
  // TODO : re-add a tooltip when the mouse is over that sortable element ?
}

// Function to display information on the top layer (in the layer manager)
function displayInfoOnMove() {
  var info_features = d3.select('#info_features');
  if (info_features.classed('active')) {
    map.selectAll('.layer').selectAll('path').on('mouseover', null);
    map.selectAll('.layer').selectAll('circle').on('mouseover', null);
    map.selectAll('.layer').selectAll('rect').on('mouseover', null);
    info_features.classed('active', false);
    info_features.style('display', 'none').html('');
    svg_map.style.cursor = '';
  } else {
    map.select('.brush').remove();
    var layers = svg_map.querySelectorAll('.layer'),
        nb_layer = layers.length;
    var top_visible_layer = null;

    for (var i = nb_layer - 1; i > -1; i--) {
      if (layers[i].style.visibility !== 'hidden') {
        top_visible_layer = _app.id_to_layer.get(layers[i].id);
        break;
      }
    }

    if (!top_visible_layer) {
      swal('', i18next.t('app_page.common.error_no_visible'), 'error');
      return;
    }

    var id_top_layer = '#' + _app.layer_to_id.get(top_visible_layer);
    var symbol = current_layers[top_visible_layer].symbol || 'path';

    map.select(id_top_layer).selectAll(symbol).on('mouseover', function (d, i) {
      var txt_info = ['<h3>', top_visible_layer, '</h3><i>Feature ', i + 1, '/', current_layers[top_visible_layer].n_features, '</i><p>'];
      var properties = result_data[top_visible_layer] ? result_data[top_visible_layer][i] : d.properties;
      Object.getOwnPropertyNames(properties).forEach(function (el) {
        txt_info.push('<br><b>' + el + '</b> : ' + properties[el]);
      });
      txt_info.push('</p>');
      info_features.style('display', null).html(txt_info.join(''));
    });

    map.select(id_top_layer).selectAll(symbol).on('mouseout', function () {
      info_features.style('display', 'none').html('');
    });

    info_features.classed('active', true);
    svg_map.style.cursor = 'help';
  }
}

/**
* Function redrawing the prop symbol / img / labels / waffles when the projection
* changes (also taking care of redrawing point layer with appropriate 'pointRadius')
*
* @return {void}
*
*/
function reproj_symbol_layer() {
  /* eslint-disable no-loop-func */
  var layers = Object.keys(current_layers);
  var n_layers = layers.length;
  var lyr_name = void 0;
  for (var ix = 0; ix < n_layers; ix++) {
    lyr_name = layers[ix];
    if (current_layers[lyr_name].renderer && (current_layers[lyr_name].renderer.indexOf('PropSymbol') > -1 || current_layers[lyr_name].renderer.indexOf('TypoSymbols') > -1 || current_layers[lyr_name].renderer.indexOf('Label') > -1)) {
      var symbol = current_layers[lyr_name].symbol;

      if (symbol === 'text') {
        // Reproject the labels :
        map.select('#' + _app.layer_to_id.get(lyr_name)).selectAll(symbol).attrs(function (d) {
          var pt = path.centroid(d.geometry);
          return { x: pt[0], y: pt[1] };
        });
      } else if (symbol === 'image') {
        // Reproject pictograms :
        map.select('#' + _app.layer_to_id.get(lyr_name)).selectAll(symbol).attrs(function (d, i) {
          var coords = path.centroid(d.geometry),
              size = +this.getAttribute('width').replace('px', '') / 2;
          return { x: coords[0] - size, y: coords[1] - size };
        });
      } else if (symbol === 'circle') {
        // Reproject Prop Symbol :
        map.select('#' + _app.layer_to_id.get(lyr_name)).selectAll(symbol).style('display', function (d) {
          return isNaN(+path.centroid(d)[0]) ? 'none' : undefined;
        }).attrs(function (d) {
          var centroid = path.centroid(d);
          return {
            r: d.properties.prop_value,
            cx: centroid[0],
            cy: centroid[1]
          };
        });
      } else if (symbol === 'rect') {
        // Reproject Prop Symbol :
        map.select('#' + _app.layer_to_id.get(lyr_name)).selectAll(symbol).style('display', function (d) {
          return isNaN(+path.centroid(d)[0]) ? 'none' : undefined;
        }).attrs(function (d) {
          var centroid = path.centroid(d),
              size = d.properties.prop_value;
          return {
            height: size,
            width: size,
            x: centroid[0] - size / 2,
            y: centroid[1] - size / 2
          };
        });
      }
    } else if (current_layers[lyr_name].pointRadius !== undefined) {
      map.select('#' + _app.layer_to_id.get(lyr_name)).selectAll('path').attr('d', path.pointRadius(current_layers[lyr_name].pointRadius));
    } else if (current_layers[lyr_name].renderer === 'TwoStocksWaffle') {
      var selection = svg_map.querySelector('#' + _app.layer_to_id.get(lyr_name)).querySelectorAll('g');
      var nbFt = selection.length;
      if (current_layers[lyr_name].symbol === 'circle') {
        for (var i = 0; i < nbFt; i++) {
          var centroid = path.centroid({
            type: 'Point',
            coordinates: selection[i].__data__.properties.centroid
          });
          var symbols = selection[i].querySelectorAll('circle');
          for (var j = 0, nb_symbol = symbols.length; j < nb_symbol; j++) {
            symbols[j].setAttribute('cx', centroid[0]);
            symbols[j].setAttribute('cy', centroid[1]);
          }
        }
      } else {
        for (var _i5 = 0; _i5 < nbFt; _i5++) {
          var _centroid = path.centroid({
            type: 'Point',
            coordinates: selection[_i5].__data__.properties.centroid
          });
          var _symbols = selection[_i5].querySelectorAll('rect');
          for (var _j = 0, _nb_symbol = _symbols.length; _j < _nb_symbol; _j++) {
            _symbols[_j].setAttribute('x', _centroid[0]);
            _symbols[_j].setAttribute('y', _centroid[1]);
          }
        }
      }
    }
  }
  /* eslint-enable no-loop-func */
}

function make_dialog_container(id_box, title, class_box) {
  var _id_box = id_box || 'dialog';
  var _title = title || '';
  var _class_box = class_box || 'dialog';
  var container = document.createElement('div');
  container.setAttribute('id', id_box);
  container.setAttribute('class', 'twbs modal fade ' + _class_box);
  container.setAttribute('tabindex', '-1');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-labelledby', 'myModalLabel');
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = '<div class="modal-dialog"><div class="modal-content"></div></div>';
  document.getElementById('twbs').appendChild(container);
  var html_content = '<div class="modal-header">\n    <button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">\xD7</span></button>\n    <h4 class="modal-title" id="gridModalLabel">' + _title + '</h4>\n    </div>\n    <div class="modal-body"> </div>\n    <div class="modal-footer">\n    <button type="button" class="btn btn-primary btn_ok" data-dismiss="modal">' + i18next.t('app_page.common.confirm') + '</button>\n    <button type="button" class="btn btn-default btn_cancel">' + i18next.t('app_page.common.cancel') + '</button>\n    </div>';
  var modal_box = new Modal(document.getElementById(_id_box), { content: html_content });
  modal_box.show();
  return modal_box;
}

var overlay_under_modal = function () {
  var twbs_div = document.querySelector('.twbs');
  var bg = document.createElement('div');
  bg.id = 'overlay_twbs';
  bg.style.width = '100%';
  bg.style.height = '100%';
  bg.style.position = 'fixed';
  bg.style.zIndex = 99;
  bg.style.top = 0;
  bg.style.left = 0;
  bg.style.background = 'rgba(0,0,0,0.4)';
  bg.style.display = 'none';
  twbs_div.insertBefore(bg, twbs_div.childNodes[0]);
  return {
    display: function display() {
      bg.style.display = '';
    },
    hide: function hide() {
      bg.style.display = 'none';
    }
  };
}();

var make_confirm_dialog2 = function (class_box, title, options) {
  var get_available_id = function get_available_id() {
    for (var i = 0; i < 50; i++) {
      if (!existing.has(i)) {
        existing.add(i);
        return i;
      }
    }
  };
  var existing = new Set();
  return function (class_box, title, options) {
    class_box = class_box || 'dialog';
    title = title || i18next.t('app_page.common.ask_confirm');
    options = options || {};

    var container = document.createElement('div');
    var new_id = get_available_id();

    container.setAttribute('id', 'myModal_' + new_id);
    container.setAttribute('class', 'twbs modal fade ' + class_box);
    container.setAttribute('tabindex', '-1');
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-labelledby', 'myModalLabel');
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = options.widthFitContent ? '<div class="modal-dialog fitContent"><div class="modal-content"></div></div>' : '<div class="modal-dialog"><div class="modal-content"></div></div>';
    document.getElementById('twbs').appendChild(container);

    container = document.getElementById('myModal_' + new_id);
    var deferred = Promise.pending();
    var text_ok = options.text_ok || i18next.t('app_page.common.confirm');
    var text_cancel = options.text_cancel || i18next.t('app_page.common.cancel');
    var html_content = '<div class="modal-header">\n      <button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">\xD7</span></button>\n      <h4 class="modal-title" id="gridModalLabel">' + title + '</h4>\n      </div>\n      <div class="modal-body"><p>' + (options.html_content || '') + '</p></div>\n      <div class="modal-footer">\n      <button type="button" class="btn btn-primary btn_ok" data-dismiss="modal">' + text_ok + '</button>\n      <button type="button" class="btn btn-default btn_cancel">' + text_cancel + '</button>\n      </div>';
    var modal_box = new Modal(container, {
      backdrop: true,
      keyboard: false,
      content: html_content
    });
    modal_box.show();
    container.modal = modal_box;
    overlay_under_modal.display();
    var func_cb = function func_cb(evt) {
      helper_esc_key_twbs_cb(evt, _onclose_false);
    };
    var clean_up_box = function clean_up_box() {
      document.removeEventListener('keydown', func_cb);
      existing.delete(new_id);
      overlay_under_modal.hide();
      container.remove();
    };
    var _onclose_false = function _onclose_false() {
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('.btn_cancel').onclick = _onclose_false;
    container.querySelector('#xclose').onclick = _onclose_false;
    container.querySelector('.btn_ok').onclick = function () {
      deferred.resolve(true);
      clean_up_box();
    };
    document.addEventListener('keydown', func_cb);
    return deferred.promise;
  };
}();

// Wrapper to obtain confirmation before actually removing a layer :
function remove_layer(name) {
  // eslint-disable-next-line no-param-reassign
  name = name || this.parentElement.parentElement.getAttribute('layer_name');
  swal({
    title: '',
    text: i18next.t('app_page.common.remove_layer', { layer: name }),
    type: 'warning',
    customClass: 'swal2_custom',
    showCancelButton: true,
    allowOutsideClick: false,
    confirmButtonColor: '#DD6B55',
    confirmButtonText: i18next.t('app_page.common.delete') + '!',
    cancelButtonText: i18next.t('app_page.common.cancel')
  }).then(function () {
    remove_layer_cleanup(name);
  }, function () {
    return null;
  });
  // ^^^^^^^^^^^^ Do nothing on cancel, but this avoid having an "uncaught exeption (cancel)" comming in the console if nothing is set here
  //  ^^^^^^^^^^^^^^^^^^^^^^^ Not sure anymore :/
}

function remove_ext_dataset() {
  swal({
    title: '',
    text: i18next.t('app_page.common.remove_tabular'),
    type: 'warning',
    showCancelButton: true,
    allowOutsideClick: false,
    confirmButtonColor: '#DD6B55',
    confirmButtonText: i18next.t('app_page.common.delete') + '!',
    cancelButtonText: i18next.t('app_page.common.cancel')
  }).then(function () {
    remove_ext_dataset_cleanup();
  }, function () {
    return null;
  });
}

function remove_ext_dataset_cleanup() {
  field_join_map = [];
  joined_dataset = [];
  dataset_name = undefined;
  var ext_dataset_img = document.getElementById('img_data_ext');
  ext_dataset_img.setAttribute('src', 'static/img/b/addtabular.png');
  ext_dataset_img.setAttribute('alt', 'Additional dataset');
  ext_dataset_img.style.cursor = 'pointer';
  ext_dataset_img.onclick = click_button_add_layer;
  var data_ext_txt = document.getElementById('data_ext');
  data_ext_txt.innerHTML = i18next.t('app_page.section1.add_ext_dataset');
  data_ext_txt.onclick = click_button_add_layer;
  data_ext_txt.classList.add('i18n');
  data_ext_txt.setAttribute('data-i18n', '[html]app_page.section1.add_ext_dataset');
  document.getElementById('remove_dataset').remove();
  document.getElementById('table_dataset_s1').remove();
  document.getElementById('join_section').innerHTML = '';
}

// Do some clean-up when a layer is removed
// Most of the job is to do when it's the targeted layer which is removed in
// order to restore functionnalities to their initial states
function remove_layer_cleanup(name) {
  if (!current_layers[name]) return;
  var layer_id = _app.layer_to_id.get(name);
  // Making some clean-up regarding the result layer :
  if (current_layers[name].is_result) {
    map.selectAll(['.lgdf_', layer_id].join('')).remove();
    if (result_data.hasOwnProperty(name)) {
      delete result_data[name];
    }
    if (current_layers[name].hasOwnProperty('key_name') && current_layers[name].renderer.indexOf('Choropleth') < 0 && current_layers[name].renderer.indexOf('Categorical') < 0) {
      send_remove_server(name);
    }
  }
  // Is the layer using a filter ? If yes, remove it:
  var filter_id = map.select('#' + layer_id).attr('filter');
  if (filter_id) {
    svg_map.querySelector(filter_id.substr(4).replace(')', '')).remove();
  }

  // Remove the layer from the map and from the layer manager :
  map.select('#' + layer_id).remove();
  document.querySelector('#sortable .' + layer_id).remove();

  // Remove the layer from the "geo export" menu :
  var a = document.getElementById('layer_to_export').querySelector('option[value="' + name + '"]');
  if (a) a.remove();

  // Remove the layer from the "mask" section if the "smoothed map" menu is open :
  if (_app.current_functionnality && _app.current_functionnality.name === 'smooth') {
    var aa = document.getElementById('stewart_mask').querySelector('option[value="' + name + '"]');
    if (aa) aa.remove();
    // Array.prototype.forEach.call(
    //   document.getElementById('stewart_mask').options, el => {
    //      if (el.value == name) el.remove(); });
  }

  // Reset the panel displaying info on the targeted layer if she"s the one to be removed :
  if (current_layers[name].targeted) {
    // Updating the top of the menu (section 1) :
    document.getElementById('table_layer_s1').remove();
    document.getElementById('remove_target').remove();
    d3.select('#img_in_geom').attrs({ id: 'img_in_geom',
      class: 'user_panel',
      src: 'static/img/b/addgeom.png',
      width: '24',
      height: '24',
      alt: 'Geometry layer' }).on('click', click_button_add_layer);
    d3.select('#input_geom').attrs({ class: 'user_panel i18n', 'data-i18n': '[html]app_page.section1.add_geom' }).html(i18next.t('app_page.section1.add_geom')).on('click', click_button_add_layer);
    // Unfiling the fields related to the targeted functionnality:
    if (_app.current_functionnality) {
      clean_menu_function();
    }

    // Update some global variables :
    field_join_map = [];
    user_data = {};
    _app.targeted_layer_added = false;

    // Redisplay the bottom of the section 1 in the menu allowing user to select a sample layer :
    document.getElementById('sample_zone').style.display = null;

    // Restore the state of the bottom of the section 1 :
    document.getElementById('join_section').innerHTML = '';

    // Disabled the button allowing the user to choose type for its layer :
    document.getElementById('btn_type_fields').setAttribute('disabled', 'true');

    reset_user_values();

    // Reset the projection (if the projection was defined via proj4):
    if (current_proj_name === 'def_proj4') {
      current_proj_name = 'NaturalEarth2';
      change_projection(current_proj_name);
      addLastProjectionSelect(current_proj_name);
    }
  }

  // There is probably better ways in JS to delete the object,
  // but in order to make it explicit that we are removing it :
  delete current_layers[name];
}

// Change color of the background
// (ie the parent "svg" element on the top of which group of elements have been added)
function handle_bg_color(color) {
  map.style('background-color', color);
}

function handle_click_hand(behavior) {
  var hb = d3.select('.hand_button');
  // eslint-disable-next-line no-param-reassign
  var b = (behavior && (typeof behavior === 'undefined' ? 'undefined' : _typeof(behavior)) !== 'object' ? behavior : false) || !hb.classed('locked') ? 'lock' : 'unlock';
  if (b === 'lock') {
    hb.classed('locked', true);
    hb.html('<img src="static/img/Twemoji_1f512.png" width="18" height="18" alt="locked"/>');
    map.select('.brush').remove();
    document.getElementById('zoom_in').parentElement.style.display = 'none';
    document.getElementById('zoom_out').parentElement.style.display = 'none';
    document.getElementById('brush_zoom_button').parentElement.style.display = 'none';
    zoom.on('zoom', function () {
      var blocked = svg_map.__zoom;return function () {
        this.__zoom = blocked;
      };
    }());
  } else {
    hb.classed('locked', false);
    hb.html('<img src="static/img/Twemoji_1f513.png" width="18" height="18" alt="unlocked"/>');
    zoom.on('zoom', zoom_without_redraw);
    document.getElementById('zoom_in').parentElement.style.display = '';
    document.getElementById('zoom_out').parentElement.style.display = '';
    document.getElementById('brush_zoom_button').parentElement.style.display = '';
    map.select('.brush').remove();
  }
}

function zoom_without_redraw() {
  var rot_val = canvas_rotation_value || '';
  var transform = void 0;
  var t_val = void 0;
  if (!d3.event || !d3.event.transform || !d3.event.sourceEvent) {
    transform = d3.zoomTransform(svg_map);
    t_val = transform.toString() + rot_val;
    map.selectAll('.layer').transition().duration(50).style('stroke-width', function () {
      var lyr_name = _app.id_to_layer.get(this.id);
      return current_layers[lyr_name].fixed_stroke ? this.style.strokeWidth : current_layers[lyr_name]['stroke-width-const'] / transform.k + 'px';
    }).attr('transform', t_val);
    map.selectAll('.scalable-legend').transition().duration(50).attr('transform', t_val);
  } else {
    t_val = d3.event.transform + rot_val;
    map.selectAll('.layer').transition().duration(50).style('stroke-width', function () {
      var lyr_name = _app.id_to_layer.get(this.id);
      return current_layers[lyr_name].fixed_stroke ? this.style.strokeWidth : current_layers[lyr_name]['stroke-width-const'] / d3.event.transform.k + 'px';
    }).attr('transform', t_val);
    map.selectAll('.scalable-legend').transition().duration(50).attr('transform', t_val);
  }

  if (scaleBar.displayed) {
    scaleBar.update();
  }
  if (window.legendRedrawTimeout) {
    clearTimeout(legendRedrawTimeout);
  }
  window.legendRedrawTimeout = setTimeout(redraw_legends_symbols, 650);
  var zoom_params = svg_map.__zoom;
  // let zoom_k_scale = proj.scale() * zoom_params.k;
  document.getElementById('input-center-x').value = round_value(zoom_params.x, 2);
  document.getElementById('input-center-y').value = round_value(zoom_params.y, 2);
  document.getElementById('input-scale-k').value = round_value(proj.scale() * zoom_params.k, 2);
  // let a = document.getElementById('form_projection'),
  //   disabled_val = (zoom_k_scale > 200) && (window._target_layer_file != undefined || result_data.length > 1)? '' : 'disabled';
  // a.querySelector('option[value="ConicConformalSec"]').disabled = disabled_val;
  // a.querySelector('option[value="ConicConformalTangent"]').disabled = disabled_val;
}

function redraw_legends_symbols(targeted_node) {
  var legend_nodes = targeted_node ? [targeted_node] : document.querySelectorAll('#legend_root_symbol');
  var hide = svg_map.__zoom.k > 4 || svg_map.__zoom.k < 0.15;
  var hidden = [];

  for (var i = 0; i < legend_nodes.length; ++i) {
    var layer_id = legend_nodes[i].classList[2].split('lgdf_')[1],
        layer_name = _app.id_to_layer.get(layer_id),
        rendered_field = current_layers[layer_name].rendered_field,
        nested = legend_nodes[i].getAttribute('nested'),
        display_value = legend_nodes[i].getAttribute('display'),
        visible = legend_nodes[i].style.visibility;

    var transform_param = legend_nodes[i].getAttribute('transform'),
        rounding_precision = legend_nodes[i].getAttribute('rounding_precision'),
        lgd_title = legend_nodes[i].querySelector('#legendtitle').innerHTML,
        lgd_subtitle = legend_nodes[i].querySelector('#legendsubtitle').innerHTML,
        notes = legend_nodes[i].querySelector('#legend_bottom_note').innerHTML;

    var rect_fill_value = legend_nodes[i].getAttribute('visible_rect') === 'true' ? {
      color: legend_nodes[i].querySelector('#under_rect').style.fill,
      opacity: legend_nodes[i].querySelector('#under_rect').style.fillOpacity
    } : undefined;

    legend_nodes[i].remove();
    createLegend_symbol(layer_name, rendered_field, lgd_title, lgd_subtitle, nested, rect_fill_value, rounding_precision, notes);
    var new_lgd = document.querySelector(['#legend_root_symbol.lgdf_', layer_id].join(''));
    new_lgd.style.visibility = visible;
    if (transform_param) new_lgd.setAttribute('transform', transform_param);

    if (display_value) {
      new_lgd.setAttribute('display', display_value);
      hidden.push(true);
    } else if (hide) {
      new_lgd.setAttribute('display', 'none');
    }
  }
  if (hide && !(hidden.length === legend_nodes.length)) {
    alertify.notify(i18next.t('app_page.notification.warning_deactivation_prop_symbol_legend'), 'warning', 5);
  }

  if (!targeted_node) {
    var legend_nodes_links_discont = document.querySelectorAll('#legend_root_lines_class');
    for (var _i6 = 0; _i6 < legend_nodes_links_discont.length; ++_i6) {
      var _layer_id = legend_nodes_links_discont[_i6].classList[2].split('lgdf_')[1],
          _layer_name = _app.id_to_layer.get(_layer_id),
          _rendered_field = current_layers[_layer_name].rendered_field,
          _display_value = legend_nodes_links_discont[_i6].getAttribute('display'),
          _visible = legend_nodes_links_discont[_i6].style.visibility;

      var _transform_param = legend_nodes_links_discont[_i6].getAttribute('transform'),
          _rounding_precision = legend_nodes_links_discont[_i6].getAttribute('rounding_precision'),
          _lgd_title = legend_nodes_links_discont[_i6].querySelector('#legendtitle').innerHTML,
          _lgd_subtitle = legend_nodes_links_discont[_i6].querySelector('#legendsubtitle').innerHTML,
          _notes = legend_nodes_links_discont[_i6].querySelector('#legend_bottom_note').innerHTML;

      var _rect_fill_value = legend_nodes_links_discont[_i6].getAttribute('visible_rect') === 'true' ? {
        color: legend_nodes_links_discont[_i6].querySelector('#under_rect').style.fill,
        opacity: legend_nodes_links_discont[_i6].querySelector('#under_rect').style.fillOpacity
      } : undefined;

      legend_nodes_links_discont[_i6].remove();
      createLegend_discont_links(_layer_name, _rendered_field, _lgd_title, _lgd_subtitle, _rect_fill_value, _rounding_precision, _notes);
      var _new_lgd = document.querySelector(['#legend_root_lines_class.lgdf_', _layer_id].join(''));
      _new_lgd.style.visibility = _visible;
      if (_transform_param) {
        _new_lgd.setAttribute('transform', _transform_param);
      }

      if (_display_value) {
        _new_lgd.setAttribute('display', _display_value);
      }
      //   hidden.push(true);
      // } else if (hide) {
      //   new_lgd.setAttribute('display', 'none');
      // }
    }
  }
}

function interpolateZoom(translate, scale) {
  var transform = d3.zoomTransform(svg_map);
  return d3.transition().duration(225).tween('zoom', function () {
    var iTranslate = d3.interpolate([transform.x, transform.y], translate);
    var iScale = d3.interpolate(transform.k, scale);
    return function (t_value) {
      svg_map.__zoom.k = iScale(t_value);
      var _t = iTranslate(t_value);
      svg_map.__zoom.x = _t[0];
      svg_map.__zoom.y = _t[1];
      zoom_without_redraw();
    };
  });
}

function zoomClick() {
  if (map_div.select('#hand_button').classed('locked')) return;
  var direction = this.id === 'zoom_in' ? 1 : -1,
      factor = 0.1,
      center = [w / 2, h / 2],
      transform = d3.zoomTransform(svg_map),
      translate = [transform.x, transform.y],
      view = { x: translate[0], y: translate[1], k: transform.k };
  var target_zoom = 1,
      translate0 = [],
      l = [];
  d3.event.preventDefault();
  target_zoom = transform.k * (1 + factor * direction);
  translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
  view.k = target_zoom;
  l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];
  view.x += center[0] - l[0];
  view.y += center[1] - l[1];
  interpolateZoom([view.x, view.y], view.k);
}

function rotate_global(angle) {
  canvas_rotation_value = ['rotate(', angle, ')'].join('');
  var zoom_transform = d3.zoomTransform(svg_map);

  map.selectAll('g.layer').transition().duration(10).attr('transform', canvas_rotation_value + ',translate(' + [zoom_transform.x, zoom_transform.y] + '),scale(' + zoom_transform.k + ')');
  // [canvas_rotation_value,
  //                   ',translate(', [zoom_transform.x, zoom_transform.y], '),',
  //                   'scale(', zoom_transform.k, ')'].join(''));
  if (northArrow.displayed) {
    var current_rotate = !isNaN(+northArrow.svg_node.attr('rotate')) ? +northArrow.svg_node.attr('rotate') : 0;
    northArrow.svg_node.attr('transform', 'rotate(' + (+angle + current_rotate) + ',' + northArrow.x_center + ', ' + northArrow.y_center + ')');
  }
  zoom_without_redraw();
}

function isInterrupted(proj_name) {
  return proj_name.indexOf('interrupted') > -1 || proj_name.indexOf('armadillo') > -1 || proj_name.indexOf('healpix') > -1;
}

function handleClipPath() {
  var proj_name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var main_layer = arguments[1];

  var proj_name_lower = proj_name.toLowerCase();
  var defs_sphere = defs.node().querySelector('#sphereClipPath');
  var defs_extent = defs.node().querySelector('#extent');
  var defs_clipPath = defs.node().querySelector('clipPath');
  if (defs_sphere) {
    defs_sphere.remove();
  }
  if (defs_extent) {
    defs_extent.remove();
  }
  if (defs_clipPath) {
    defs_clipPath.remove();
  }

  if (isInterrupted(proj_name_lower)) {
    defs.append('path').datum({ type: 'Sphere' }).attr('id', 'sphereClipPath').attr('d', path);

    defs.append('clipPath').attr('id', 'clip').append('use').attr('xlink:href', '#sphereClipPath');

    map.selectAll('.layer:not(.no_clip)').attr('clip-path', 'url(#clip)');

    svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
  } else if (proj_name_lower.indexOf('conicconformal') > -1) {
    var outline = d3.geoGraticule().extentMajor([[-180, -60], [180, 90]]).outline();

    // proj.fitSize([w, h], outline);
    // proj.scale(s).translate(t)
    // path.projection(proj);

    defs.append('path').attr('id', 'extent').attr('d', path(outline));
    defs.append('clipPath').attr('id', 'clip').append('use').attr('xlink:href', '#extent');

    map.selectAll('.layer:not(.no_clip)').attr('clip-path', 'url(#clip)');
    // map.selectAll('.layer')
    //     .selectAll('path')
    //     .attr('d', path);
    //
    // reproj_symbol_layer();
    // if (main_layer) {
    //   center_map(main_layer);
    //   zoom_without_redraw();
    // }
  } else {
    map.selectAll('.layer').attr('clip-path', null);
  }
}

function change_projection(new_proj_name) {
  // Disable the zoom by rectangle selection if the user is using it :
  map.select('.brush').remove();

  // Only keep the first argument of the rotation parameter :
  var prev_rotate = proj.rotate ? [proj.rotate()[0], 0, 0] : [0, 0, 0];
  var def_proj = available_projections.get(new_proj_name);

  // Update global variables:
  // proj = def_proj.custom ? d3.geoProjection(window[def_proj.name]()).scale(def_proj.scale)
  //      : d3[def_proj.name]();
  proj = d3[def_proj.name]();
  if (def_proj.parallels) proj = proj.parallels(def_proj.parallels);else if (def_proj.parallel) proj = proj.parallel(def_proj.parallel);
  if (def_proj.clipAngle) proj = proj.clipAngle(def_proj.clipAngle);
  if (def_proj.rotate) prev_rotate = def_proj.rotate;
  if (proj.rotate) proj.rotate(prev_rotate);

  path = d3.geoPath().projection(proj).pointRadius(4);

  // Enable or disable the 'brush zoom' button allowing to zoom according to a rectangle selection:
  document.getElementById('brush_zoom_button').style.display = proj.invert !== undefined ? '' : 'none';

  // Reset the zoom on the targeted layer (or on the top layer if no targeted layer):
  var layer_name = Object.getOwnPropertyNames(user_data)[0];
  if (!layer_name && def_proj.bounds) {
    scale_to_bbox(def_proj.bounds);
  } else if (!layer_name) {
    var layers_active = Array.prototype.filter.call(svg_map.querySelectorAll('.layer'), function (f) {
      return f.style.visibility !== 'hidden';
    });
    layer_name = layers_active.length > 0 ? _app.id_to_layer.get(layers_active[layers_active.length - 1].id) : undefined;
  }
  if (layer_name) {
    scale_to_lyr(layer_name);
    center_map(layer_name);
    zoom_without_redraw();
  } else {
    proj.translate(t).scale(s);
    map.selectAll('.layer').selectAll('path').attr('d', path);
    reproj_symbol_layer();
  }

  // Remove the tooltip used for projections using proj4 :
  var selectProj = document.querySelector('#form_projection2');
  selectProj.removeAttribute('tooltip');
  selectProj.removeEventListener('mouseover', displayTooltipProj4);
  selectProj.removeEventListener('mouseout', removeTooltipProj4);
  // Set or remove the clip-path according to the projection:
  handleClipPath(new_proj_name, layer_name);
}

function change_projection_4(_proj) {
  remove_layer_cleanup('Sphere');
  // Disable the zoom by rectangle selection if the user is using it :
  map.select('.brush').remove();

  // Only keep the first argument of the rotation parameter :
  var prev_rotate = proj.rotate ? [proj.rotate()[0], 0, 0] : [0, 0, 0];

  proj = getD3ProjFromProj4(_proj);
  path = d3.geoPath().projection(proj).pointRadius(4);

  // Enable or disable the "brush zoom" button allowing to zoom according to a rectangle selection:
  document.getElementById('brush_zoom_button').style.display = proj.invert !== undefined ? '' : 'none';

  // // Reset the zoom on the targeted layer (or on the top layer if no targeted layer):
  var layer_name = Object.getOwnPropertyNames(user_data)[0];
  if (!layer_name) {
    var layers_active = Array.prototype.filter.call(svg_map.querySelectorAll('.layer'), function (f) {
      return f.style.visibility !== 'hidden';
    });
    layer_name = layers_active.length > 0 ? _app.id_to_layer.get(layers_active[layers_active.length - 1].id) : undefined;
  }
  if (!layer_name || layer_name === 'World' || layer_name === 'Sphere' || layer_name === 'Graticule') {
    scale_to_bbox([-10.6700, 34.5000, 31.5500, 71.0500]);
  } else {
    var rv = fitLayer(layer_name);
    s = rv[0];
    t = rv[1];
    if (isNaN(s) || s === 0 || isNaN(t[0]) || isNaN(t[1])) {
      s = 100;t = [0, 0];
      scale_to_bbox([-10.6700, 34.5000, 31.5500, 71.0500]);
    }
  }
  if (isNaN(s) || s === 0 || isNaN(t[0]) || isNaN(t[1])) {
    s = 100;t = [0, 0];
    console.log('Error');
    return false;
  }
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
  center_map(layer_name);
  zoom_without_redraw();

  // Remove the existing clip path if any :
  handleClipPath();
  return true;
}

// Function to switch the visibility of a layer the open/closed eye button
function handle_active_layer(name) {
  var fill_value = void 0,
      parent_div = void 0,
      selec = void 0,
      at_end = void 0;

  if (document.getElementById('info_features').className === 'active') {
    displayInfoOnMove();
    at_end = true;
  }
  if (!name) {
    selec = this;
    parent_div = selec.parentElement;
    name = parent_div.parentElement.getAttribute('layer_name'); // eslint-disable-line no-param-reassign
  } else {
    selec = document.querySelector('#sortable .' + _app.layer_to_id.get(name) + ' .active_button');
    parent_div = selec.parentElement;
  }
  var func = function func() {
    handle_active_layer(name);
  };
  if (selec.id === 'eye_closed') {
    fill_value = 1;
    var eye_open = make_eye_button('open');
    eye_open.onclick = func;
    parent_div.replaceChild(eye_open, selec);
  } else {
    fill_value = 0;
    var eye_closed = make_eye_button('closed');
    eye_closed.onclick = func;
    parent_div.replaceChild(eye_closed, selec);
  }
  map.select('#' + _app.layer_to_id.get(name)).style('visibility', fill_value === 0 ? 'hidden' : 'initial');
  map.selectAll('.lgdf_' + _app.layer_to_id.get(name)).style('visibility', fill_value === 0 ? 'hidden' : 'initial');

  if (at_end) {
    displayInfoOnMove();
  }
}

// Function to handle the title add and changes
function handle_title(txt) {
  var title = d3.select('#map_title').select('text');
  if (title.node()) {
    title.text(txt);
  } else {
    map.append('g').attrs({ class: 'legend title', id: 'map_title' }).style('cursor', 'pointer').insert('text').attrs({ x: w / 2, y: h / 12, 'alignment-baseline': 'middle', 'text-anchor': 'middle' }).styles({ 'font-family': 'Arial, Helvetica, sans-serif', 'font-size': '20px', position: 'absolute', color: 'black' }).text(txt).on('contextmenu dblclick', function () {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      handle_title_properties();
    }).call(drag_elem_geo);
  }
}

function handle_title_properties() {
  var title = d3.select('#map_title').select('text');
  if (!title.node() || title.text() === '') {
    swal({
      title: '',
      text: i18next.t('app_page.common.error_no_title'),
      type: 'error',
      allowOutsideClick: true,
      allowEscapeKey: true
    }).then(function () {
      return null;
    }, function () {
      return null;
    });
    return;
  }
  var title_props = {
    size: title.style('font-size'),
    font_weight: title.style('font-weight'),
    font_style: title.style('font-style'),
    text_decoration: title.style('text-decoration'),
    color: title.style('fill'),
    position_x: title.attr('x'),
    position_x_pct: round_value(+title.attr('x') / w * 100, 1),
    position_y: title.attr('y'),
    position_y_pct: round_value(+title.attr('y') / h * 100, 1),
    font_family: title.style('font-family'),
    stroke: title.style('stroke'),
    stroke_width: title.style('stroke-width')
  };
  title_props.font_weight = title_props.font_weight === '400' || title_props.font_weight === '' ? '' : 'bold';
  // Font name don't seems to be formatted in the same way on Firefox and Chrome
  // (a space is inserted after the comma in Chrome so we are removing it)
  title_props.font_family = title_props.font_family ? title_props.font_family.replace(', ', ',') : title_props.font_family;

  // Properties on the title are changed in real-time by the user
  // then it will be rollbacked to original properties if Cancel is clicked
  make_confirm_dialog2('mapTitleitleDialogBox', i18next.t('app_page.title_box.title'), { widthFitContent: true }).then(function (confirmed) {
    if (!confirmed) {
      title.attrs({ x: title_props.position_x, y: title_props.position_y }).styles({
        fill: title_props.color,
        stroke: title_props.stroke,
        'stroke-width': title_props.stroke_width,
        'font-family': title_props.font_family,
        'font-size': title_props.size,
        'font-style': title_props.font_style,
        'font-weight': title_props.font_weight,
        'text-decoration': title_props.text_decoration
      });
    }
  });
  var box_content = d3.select('.mapTitleitleDialogBox').select('.modal-body').append('div').style('margin', '15x');
  box_content.append('p').html(i18next.t('app_page.title_box.font_size')).insert('input').attrs({ type: 'number', min: 2, max: 40, step: 1, value: +title_props.size.split('px')[0] }).style('width', '65px').on('change', function () {
    title.style('font-size', this.value + 'px');
  });
  box_content.append('p').html(i18next.t('app_page.title_box.xpos')).insert('input').attrs({ type: 'number', min: 0, max: 100, step: 1, value: title_props.position_x_pct }).style('width', '65px').on('change', function () {
    title.attr('x', w * +this.value / 100);
  });
  box_content.append('p').html(i18next.t('app_page.title_box.ypos')).insert('input').attrs({ type: 'number', min: 0, max: 100, step: 1, value: title_props.position_y_pct }).style('width', '65px').on('change', function () {
    title.attr('y', h * +this.value / 100);
  });
  box_content.append('p').html(i18next.t('app_page.title_box.font_color')).insert('input').attrs({ type: 'color', value: rgb2hex(title_props.color) }).on('change', function () {
    title.style('fill', this.value);
  });

  var font_select = box_content.append('p').html(i18next.t('app_page.title_box.font_family')).insert('select').attr('class', 'params').on('change', function () {
    title.style('font-family', this.value);
  });
  available_fonts.forEach(function (font) {
    font_select.append('option').text(font[0]).attr('value', font[1]);
  });
  font_select.node().selectedIndex = available_fonts.map(function (d) {
    return d[1] === title_props.font_family ? '1' : '0';
  }).indexOf('1');

  var options_format = box_content.append('p'),
      btn_bold = options_format.insert('span').attr('class', title_props.font_weight === 'bold' ? 'active button_disc' : 'button_disc').html('<img title="Bold" src="data:image/gif;base64,R0lGODlhFgAWAID/AMDAwAAAACH5BAEAAAAALAAAAAAWABYAQAInhI+pa+H9mJy0LhdgtrxzDG5WGFVk6aXqyk6Y9kXvKKNuLbb6zgMFADs=">'),
      btn_italic = options_format.insert('span').attr('class', title_props.font_style === 'italic' ? 'active button_disc' : 'button_disc').html('<img title="Italic" src="data:image/gif;base64,R0lGODlhFgAWAKEDAAAAAF9vj5WIbf///yH5BAEAAAMALAAAAAAWABYAAAIjnI+py+0Po5x0gXvruEKHrF2BB1YiCWgbMFIYpsbyTNd2UwAAOw==">'),
      btn_underline = options_format.insert('span').attr('class', title_props.text_decoration === 'underline' ? 'active button_disc' : 'button_disc').html('<img title="Underline" src="data:image/gif;base64,R0lGODlhFgAWAKECAAAAAF9vj////////yH5BAEAAAIALAAAAAAWABYAAAIrlI+py+0Po5zUgAsEzvEeL4Ea15EiJJ5PSqJmuwKBEKgxVuXWtun+DwxCCgA7">');

  btn_bold.on('click', function () {
    if (this.classList.contains('active')) {
      this.classList.remove('active');
      title.style('font-weight', '');
    } else {
      this.classList.add('active');
      title.style('font-weight', 'bold');
    }
  });
  btn_italic.on('click', function () {
    if (this.classList.contains('active')) {
      this.classList.remove('active');
      title.style('font-style', '');
    } else {
      this.classList.add('active');
      title.style('font-style', 'italic');
    }
  });
  btn_underline.on('click', function () {
    if (this.classList.contains('active')) {
      this.classList.remove('active');
      title.style('text-decoration', '');
    } else {
      this.classList.add('active');
      title.style('text-decoration', 'underline');
    }
  });

  var hasBuffer = title_props.stroke !== 'none';
  var buffer_section1 = box_content.append('p');
  var buffer_section2 = box_content.append('p').style('display', hasBuffer ? '' : 'none');
  box_content.append('p').style('clear', 'both');

  buffer_section1.append('input').attrs({ type: 'checkbox', id: 'title_buffer_chkbox', checked: hasBuffer ? true : null }).on('change', function () {
    if (this.checked) {
      buffer_section2.style('display', '');
      title.style('stroke', buffer_color.node().value).style('stroke-width', buffer_width.node().value + 'px');
    } else {
      buffer_section2.style('display', 'none');
      title.style('stroke', 'none').style('stroke-width', '1px');
    }
  });

  buffer_section1.append('label').attrs({ for: 'title_buffer_chkbox' }).text(i18next.t('app_page.title_box.buffer'));

  var buffer_color = buffer_section2.insert('input').style('float', 'left').attrs({ type: 'color', value: hasBuffer ? rgb2hex(title_props.stroke) : '#ffffff' }).on('change', function () {
    title.style('stroke', this.value);
  });

  buffer_section2.insert('span').style('float', 'right').html(' px');

  var buffer_width = buffer_section2.insert('input').styles({ float: 'right', width: '60px' }).attrs({ type: 'number', step: '0.1', value: hasBuffer ? +title_props.stroke_width.replace('px', '') : 1 }).on('change', function () {
    title.style('stroke-width', this.value + 'px');
  });
}

/** Function triggered by the change of map/canvas size
* @param {Array} shape - An Array of two elements : [width, height] to use;
*                generally only used once at the time so `shape` values
*                are like [null, 750] or [800, null]
*                but also works with the 2 params together like [800, 750])
*/
function canvas_mod_size(shape) {
  if (shape[0]) {
    w = +shape[0];
    map.attr('width', w).call(zoom_without_redraw);
    map_div.style('width', w + 'px');
    if (w + 360 + 30 < window.innerWidth) {
      document.querySelector('.light-menu').style.right = '-30px';
    } else {
      document.querySelector('.light-menu').style.right = '0px';
    }
  }
  if (shape[1]) {
    h = +shape[1];
    map.attr('height', h).call(zoom_without_redraw);
    map_div.style('height', h + 'px');
  }
  move_legends();

  // Lets update the corresponding fields in the export section :
  var ratio = void 0;
  var format = document.getElementById('select_png_format').value;
  if (format === 'web') {
    ratio = 1;
  } else if (format === 'user_defined') {
    ratio = 118.11;
  } else {
    return;
  }
  document.getElementById('export_png_width').value = Math.round(w * ratio * 10) / 10;
  document.getElementById('export_png_height').value = Math.round(h * ratio * 10) / 10;
}

function patchSvgForFonts() {
  function getListUsedFonts() {
    var elems = [svg_map.getElementsByTagName('text'), svg_map.getElementsByTagName('p')];
    var needed_definitions = [];
    // elems.map(d => (d ? d : []));
    elems.map(function (d) {
      return d || [];
    });
    for (var j = 0; j < 2; j++) {
      var _loop3 = function _loop3(i) {
        var font_elem = elems[j][i].style.fontFamily;
        customs_fonts.forEach(function (font) {
          if (font_elem.indexOf(font) > -1 && needed_definitions.indexOf(font) === -1) {
            needed_definitions.push(font);
          }
        });
      };

      for (var i = 0; i < elems[j].length; i++) {
        _loop3(i);
      }
    }
    return needed_definitions;
  }

  var needed_definitions = getListUsedFonts();
  if (needed_definitions.length === 0) {
    return;
  }
  var fonts_definitions = Array.prototype.filter.call(document.styleSheets, function (i) {
    return i.href && i.href.indexOf('style-fonts.css') > -1 ? i : null;
  })[0].cssRules;
  var fonts_to_add = needed_definitions.map(function (name) {
    return String(fonts_definitions[customs_fonts.indexOf(name)].cssText);
  });
  var style_elem = document.createElement('style');
  style_elem.innerHTML = fonts_to_add.join(' ');
  svg_map.querySelector('defs').appendChild(style_elem);
}

function unpatchSvgForFonts() {
  var defs_style = svg_map.querySelector('defs').querySelector('style');
  if (defs_style) defs_style.remove();
}

function patchSvgForInkscape() {
  svg_map.setAttribute('xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape');
  var elems = svg_map.getElementsByTagName('g');
  for (var i = elems.length - 1; i > -1; i--) {
    if (elems[i].id === '') {
      continue;
    } else if (elems[i].classList.contains('layer')) {
      elems[i].setAttribute('inkscape:label', elems[i].id);
    } else if (elems[i].id.indexOf('legend') > -1) {
      var layer_name = elems[i].className.baseVal.split('lgdf_')[1];
      elems[i].setAttribute('inkscape:label', 'legend_' + layer_name);
    } else {
      elems[i].setAttribute('inkscape:label', elems[i].id);
    }
    elems[i].setAttribute('inkscape:groupmode', 'layer');
  }
}

function unpatchSvgForInkscape() {
  svg_map.removeAttribute('xmlns:inkscape');
  var elems = svg_map.getElementsByTagName('g');
  for (var i = elems.length - 1; i > -1; i--) {
    if (elems[i].id !== '') {
      elems[i].removeAttribute('inkscape:label');
      elems[i].removeAttribute('inkscape:groupmode');
    }
  }
}

function check_output_name(name, extension) {
  var part = name.split('.');
  var regexpName = new RegExp(/^[a-z0-9_]+$/i);
  if (regexpName.test(part[0]) && part[0].length < 250) {
    return part[0] + '.' + extension;
  }
  return 'export.' + extension;
}

function patchSvgForForeignObj() {
  var elems = document.getElementsByTagName('foreignObject');
  var originals = [];
  for (var i = 0; i < elems.length; i++) {
    var el = elems[i];
    originals.push([el.getAttribute('width'), el.getAttribute('height')]);
    el.setAttribute('width', '100%');
    el.setAttribute('height', '100%');
  }
  return originals;
}

function unpatchSvgForForeignObj(originals) {
  var elems = document.getElementsByTagName('foreignObject');
  for (var i = 0; i < originals.length; i++) {
    var el = elems[i];
    el.setAttribute('width', originals[i][0]);
    el.setAttribute('height', originals[i][1]);
  }
}

function patchSvgBackground() {
  var background = document.createElement('rect');
  background.id = 'background';
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', document.getElementById('bg_color').value);
  svg_map.insertBefore(background, svg_map.firstChild);
}

function unpatchSvgBackground() {
  svg_map.querySelector('rect#background').remove();
}

function export_compo_svg(output_name) {
  output_name = check_output_name(output_name, 'svg'); // eslint-disable-line no-param-reassign
  patchSvgForInkscape();
  patchSvgForFonts();
  patchSvgBackground();
  var dimensions_foreign_obj = patchSvgForForeignObj();
  var targetSvg = document.getElementById('svg_map'),
      serializer = new XMLSerializer();
  var source = serializer.serializeToString(targetSvg);

  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  source = ['<?xml version="1.0" standalone="no"?>\r\n', source].join('');

  var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  clickLinkFromDataUrl(url, output_name).then(function (a) {
    unpatchSvgForFonts();
    unpatchSvgForForeignObj(dimensions_foreign_obj);
    unpatchSvgForInkscape();
    unpatchSvgBackground();
  }).catch(function (err) {
    display_error_during_computation();
    console.log(err);
  });
}

// Maybe PNGs should be rendered on server side in order to avoid limitations that
//   could be encountered in the browser (as 'out of memory' error)
function _export_compo_png() {
  var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'web';
  var scalefactor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var output_name = arguments[2];

  document.getElementById('overlay').style.display = '';
  output_name = check_output_name(output_name, 'png');
  var dimensions_foreign_obj = patchSvgForForeignObj();
  patchSvgForFonts();
  var targetCanvas = d3.select('body').append('canvas').attrs({ id: 'canvas_map_export', height: h, width: w }).node();
  var targetSVG = document.querySelector('#svg_map');
  var mime_type = 'image/png';
  var svg_xml = void 0,
      ctx = void 0,
      img = void 0;

  // At this point it might be better to wrap the whole function in a try catch ?
  // (as it seems it could fail on various points :
  // XMLSerializer()).serializeToString, toDataURL, changeResolution, etc.)
  try {
    svg_xml = new XMLSerializer().serializeToString(targetSVG);
    ctx = targetCanvas.getContext('2d');
    img = new Image();
  } catch (err) {
    document.getElementById('overlay').style.display = 'none';
    targetCanvas.remove();
    display_error_during_computation(String(err));
    return;
  }
  if (scalefactor !== 1) {
    try {
      changeResolution(targetCanvas, scalefactor);
    } catch (err) {
      document.getElementById('overlay').style.display = 'none';
      targetCanvas.remove();
      display_error_during_computation(i18next.t('app_page.common.error_too_high_resolution') + ' ' + String(err));
      return;
    }
  }
  var imgUrl = void 0;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg_xml);
  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    try {
      imgUrl = targetCanvas.toDataURL(mime_type);
    } catch (err) {
      document.getElementById('overlay').style.display = 'none';
      targetCanvas.remove();
      display_error_during_computation(String(err));
      return;
    }
    clickLinkFromDataUrl(imgUrl, output_name).then(function (_) {
      unpatchSvgForFonts();
      unpatchSvgForForeignObj(dimensions_foreign_obj);
      document.getElementById('overlay').style.display = 'none';
      targetCanvas.remove();
    }).catch(function (err) {
      display_error_during_computation();
      console.log(err);
    });
  };
}

function export_layer_geo(layer, type, projec, proj4str) {
  var formToSend = new FormData();
  formToSend.append('layer', layer);
  formToSend.append('layer_name', current_layers[layer].key_name);
  formToSend.append('format', type);
  if (projec === 'proj4string') {
    formToSend.append('projection', JSON.stringify({ proj4string: proj4str }));
  } else {
    formToSend.append('projection', JSON.stringify({ name: projec }));
  }
  var extensions = new Map([['GeoJSON', 'geojson'], ['TopoJSON', 'topojson'], ['ESRI Shapefile', 'zip'], ['GML', 'zip'], ['KML', 'kml']]);

  xhrequest('POST', 'get_layer2', formToSend, true).then(function (data) {
    if (data.indexOf('{"Error"') === 0 || data.length === 0) {
      var error_message = void 0;
      if (data.indexOf('{"Error"') < 5) {
        error_message = i18next.t(JSON.parse(data).Error);
      } else {
        error_message = i18next.t('app_page.common.error_msg');
      }
      swal({
        title: 'Oops...',
        text: error_message,
        type: 'error',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(function () {
        return null;
      }, function () {
        return null;
      });
      return;
    }
    var ext = extensions.get(type),
        filename = [layer, ext].join('.');
    var dataStr = void 0;
    if (ext.indexOf('json') > -1) {
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);
    } else if (ext.indexOf('kml') > -1) {
      dataStr = 'data:text/xml;charset=utf-8,' + encodeURIComponent(data);
    } else {
      dataStr = 'data:application/zip;base64,' + data;
    }
    clickLinkFromDataUrl(dataStr, filename);
  }, function (error) {
    console.log(error);
  });
}

/*
* Straight from http://stackoverflow.com/a/26047748/5050917
*
*/
function changeResolution(canvas, scaleFactor) {
  // Set up CSS size if it's not set up already
  if (!canvas.style.width) canvas.style.width = canvas.width + 'px'; // eslint-disable-line no-param-reassign
  if (!canvas.style.height) canvas.style.height = canvas.height + 'px'; // eslint-disable-line no-param-reassign

  canvas.width = Math.ceil(canvas.width * scaleFactor); // eslint-disable-line no-param-reassign
  canvas.height = Math.ceil(canvas.height * scaleFactor); // eslint-disable-line no-param-reassign
  var ctx = canvas.getContext('2d');
  ctx.scale(scaleFactor, scaleFactor);
}

function fill_export_png_options(displayed_ratio) {
  var select_size_png = d3.select('#select_png_format');
  select_size_png.selectAll('option').remove();

  select_size_png.append('option').attrs({ value: 'web', class: 'i18n', 'data-i18n': '[text]app_page.section5b.web' });
  select_size_png.append('option').attrs({ value: 'user_defined', class: 'i18n', 'data-i18n': '[text]app_page.section5b.user_defined' });

  if (displayed_ratio === 'portrait') {
    select_size_png.append('option').attrs({ value: 'A5_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A5_portrait' });
    select_size_png.append('option').attrs({ value: 'A4_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A4_portrait' });
    select_size_png.append('option').attrs({ value: 'A3_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A3_portrait' });
  } else if (displayed_ratio === 'landscape') {
    select_size_png.append('option').attrs({ value: 'A5_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A5_landscape' });
    select_size_png.append('option').attrs({ value: 'A4_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A4_landscape' });
    select_size_png.append('option').attrs({ value: 'A3_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A3_landscape' });
  }
  localize('#select_png_format > .i18n');
}

var beforeUnloadWindow = function beforeUnloadWindow(event) {
  get_map_template().then(function (jsonParams) {
    window.localStorage.removeItem('magrit_project');
    window.localStorage.setItem('magrit_project', jsonParams);
  });
  // eslint-disable-next-line no-param-reassign
  event.returnValue = _app.targeted_layer_added || Object.getOwnPropertyNames(result_data).length > 0 ? 'Confirm exit' : undefined;
};
'use strict';

/**
* Helper function in order to have a colorbrewer color ramp with
* non-supported number of value using interpolation between the colorbrewer color
* to fit the requested number of classes.
* If the number of class fit the size of a colorbrewer ramp (3 < nb_class < 9)
* the genuine colorbrewer array is directly returned.
*
* @param {interger} nbClass - The number of classes/colors wanted.
* @param {integer} name - The name of the colorBrewer palette to use
* @return {array} - An array of color with the desired length
*/
var getColorBrewerArray = function getColorBrewerArray(nbClass, name) {
  if (nbClass < 10 && nbClass >= 3) {
    var colors = colorbrewer[name][nbClass];
    return colors;
  } else if (nbClass < 3) {
    var _colors = colorbrewer[name][3];
    return [rgb2hex(interpolateColor(hexToRgb(_colors[0]), hexToRgb(_colors[1]))), rgb2hex(interpolateColor(hexToRgb(_colors[1]), hexToRgb(_colors[2])))];
  } else if (nbClass > 9 && nbClass < 18) {
    var _colors2 = colorbrewer[name][9];
    var diff = nbClass - 9;
    return interp_n(_colors2, diff, 9);
  } else if (nbClass >= 18) {
    var _colors3 = colorbrewer[name][9];
    _colors3 = interp_n(_colors3, 8, 9);
    return interp_n(_colors3, nbClass - _colors3.length, nbClass);
  }
};

/**
* Function to make color interpolation from "colors" (an array of n colors)
* to a larger array of "k" colors (using same start and stop than the original)
*
* @param {array} colors - An array of colors
* @param {integer} diff -
* @param {number} k - The length of the targeted color palette
* @return {array} - An array of k colors.
*/
var interp_n = function interp_n(colors, diff, k) {
  var tmp = [];
  var new_colors = [];
  for (var i = 0; i < diff; ++i) {
    tmp.push(rgb2hex(interpolateColor(hexToRgb(colors[i]), hexToRgb(colors[i + 1]))));
  }
  for (var _i = 0; _i < k; ++_i) {
    new_colors.push(colors[_i]);
    if (tmp[_i]) new_colors.push(tmp[_i]);
  }
  return new_colors;
};

/**
* Convert rgb color to hexcode.
*
* @param {string} rgb - The RGB color.
* @return {string} - The color as an hexcode.
*
*/
function rgb2hex(rgb) {
  // Originally from  http://jsfiddle.net/mushigh/myoskaos/
  if (typeof rgb === 'string') {
    if (rgb.indexOf('#') > -1 || rgb.indexOf('rgb') < 0) {
      return rgb;
    }
    var _rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return _rgb && _rgb.length === 4 ? '#' + ('0' + parseInt(_rgb[1], 10).toString(16)).slice(-2) + ('0' + parseInt(_rgb[2], 10).toString(16)).slice(-2) + ('0' + parseInt(_rgb[3], 10).toString(16)).slice(-2) : '';
  }
  return rgb && rgb.length === 3 ? '#' + ('0' + parseInt(rgb[0], 10).toString(16)).slice(-2) + ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) + ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) : '';
}

/**
* Convert color hexcode to RGB code.
*
* @param {string} hex - The input hexcode.
* @param {string} out - The output format between "string" and "array"
* @return {string|array} - the rgb color as a string or as an array.
*
*/
function hexToRgb(hex, out) {
  // Originally from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  var res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (out === 'string') {
    return res ? 'rgb(' + parseInt(res[1], 16) + ',' + parseInt(res[2], 16) + ',' + parseInt(res[3], 16) + ')' : null;
  }
  return res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : null;
}

// Return the interpolated value at "factor" (0<factor<1) between color1 and color2
// (if no factor is provided the default value of 0.5 is used,
// corresponding to the middle between the two colors).
// Args :
//    - color1 : array of 3 integer for rgb color as [R, G, B]
//    - color2 : array of 3 integer for rgb color as [R, G, B]
var interpolateColor = function interpolateColor(color1, color2) {
  var factor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.5;

  var result = color1.slice();
  for (var i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
};

// Just a "Colors" object with a convenience "random" method
// ... when a random color is needed (they aren't specialy pretty colors though!)
var Colors = {
  names: {
    aqua: '#00ffff',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    black: '#000000',
    blue: '#0000ff',
    brown: '#a52a2a',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgrey: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkviolet: '#9400d3',
    fuchsia: '#ff00ff',
    gold: '#ffd700',
    green: '#008000',
    indigo: '#4b0082',
    khaki: '#f0e68c',
    lightblue: '#add8e6',
    lightcyan: '#e0ffff',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    magenta: '#ff00ff',
    maroon: '#800000',
    navy: '#000080',
    olive: '#808000',
    orange: '#ffa500',
    pink: '#ffc0cb',
    purple: '#800080',
    violet: '#800080',
    red: '#ff0000',
    silver: '#c0c0c0',
    white: '#ffffff',
    yellow: '#ffff00'
  },
  random: function random() {
    var keys = Object.keys(this.names);
    var n = keys.length;
    var result = 0;
    var count = 0;
    for (var i = 0; i < n; i++) {
      var prop = keys[i];
      count += 1;
      if (Math.random() < 1 / count) {
        result = prop;
      }
    }
    return result;
  }
};

var ColorsSelected = {
  // These colors came from "Pastel1" and "Pastel2" coloramps from ColorBrewer
  colorCodes: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc', '#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
  // In order to avoid randomly returning the same color
  // as the last one, at least for the first layers
  seen: new Set(),
  random: function random() {
    var to_rgb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var nb_color = this.colorCodes.length;
    var seen = this.seen;
    var result_color = this.colorCodes[0],
        attempts = 40; // To avoid a while(true) if it went wrong for any reason
    if (seen.size === nb_color) {
      seen = new Set();
    }
    while (attempts > 0) {
      var ix = Math.round(Math.random() * (nb_color - 1));
      result_color = this.colorCodes[ix];
      if (!seen.has(result_color)) {
        seen.add(result_color);
        break;
      } else {
        attempts -= 1;
      }
    }
    return to_rgb ? hexToRgb(result_color) : result_color;
  }
};

// Copy-paste from https://gist.github.com/jdarling/06019d16cb5fd6795edf
//   itself adapted from http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
var randomColor = function () {
  var golden_ratio_conjugate = 0.618033988749895;
  var _h = Math.random();

  var hslToRgb = function hslToRgb(h, s, l) {
    var r = void 0,
        g = void 0,
        b = void 0;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var hue2rgb = function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return '#' + Math.round(r * 255).toString(16) + Math.round(g * 255).toString(16) + Math.round(b * 255).toString(16);
  };

  return function () {
    _h += golden_ratio_conjugate;
    _h %= 1;
    return hslToRgb(_h, 0.5, 0.60);
  };
}();

var addNewCustomPalette = function addNewCustomPalette(palette_name, colors) {
  _app.custom_palettes.set(palette_name, colors);
};
'use strict';

function ContextMenu() {
  this.items = [];

  this.addItem = function (item) {
    this.items.push({
      isSimpleItem: true,
      name: item.name,
      action: item.action
    });
  };

  this.addSubMenu = function (item) {
    this.items.push({
      isSimpleItem: false,
      name: item.name,
      menu: new ContextMenu()
    });
    this.items[this.items.length - 1].menu.setItems(item.items);
  };

  this.removeItemByName = function (name) {
    for (var i = this.items.length - 1; i > 0; i--) {
      if (this.items[i].name.valueOf() === name.valueOf()) {
        this.items.splice(i, 1);
        break;
      }
    }
  };

  this.setItems = function (items) {
    this.items = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].name) {
        if (items[i].action) {
          this.addItem(items[i]);
        } else if (items[i].items) {
          this.addSubMenu(items[i]);
        }
      }
    }
  };

  this.showMenu = function (event, parent, items) {
    if (items) {
      this.setItems(items);
    }

    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }

    if (event.stopPropagation) {
      event.stopPropagation();
    }

    this.initMenu(parent);
    this.DOMObj.style.top = event.clientY + document.body.scrollTop + 'px';
    this.DOMObj.style.left = event.clientX + 'px';
    var self = this;
    var hideMenu = function hideMenu() {
      if (self.DOMObj && self.DOMObj.parentNode && self.DOMObj.parentNode.removeChild) {
        self.DOMObj.parentNode.removeChild(self.DOMObj);
      }
      self.onclick = undefined;
      document.removeEventListener('click', hideMenu);
    };
    setTimeout(function () {
      document.addEventListener('click', hideMenu);
    }, 150);
  };

  this.initMenu = function (parent) {
    if (this.DOMObj && this.DOMObj.parentNode && this.DOMObj.parentNode.removeChild) {
      this.DOMObj.parentNode.removeChild(this.DOMObj);
    }
    var self = this;
    var menu = document.createElement('div');
    menu.className = 'context-menu';
    var list = document.createElement('ul');
    menu.appendChild(list);
    for (var i = 0; i < this.items.length; i++) {
      var item = document.createElement('li');
      list.appendChild(item);
      item.setAttribute('data-index', i);
      var name = document.createElement('span');
      name.className = 'context-menu-item-name';
      name.textContent = this.items[i].name;
      item.appendChild(name);
      if (this.items[i].isSimpleItem) {
        item.onclick = function () {
          var ix = this.getAttribute('data-index');
          self.items[ix].action();
        };
      } else {
        var arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.innerHTML = '&#9658;';
        name.appendChild(arrow);
        this.items[i].menu.initMenu(item);
        this.items[i].menu.DOMObj.style.display = 'none';
        item.onmouseover = function () {
          var _this = this;

          setTimeout(function () {
            _this.querySelectorAll('.context-menu')[0].style.display = '';
          }, 500);
        };
        item.onmouseout = function () {
          var _this2 = this;

          setTimeout(function () {
            _this2.querySelectorAll('.context-menu')[0].style.display = 'none';
          }, 500);
        };
      }
    }
    this.DOMObj = menu;
    parent.appendChild(menu);
  };
}
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function getBreaks(values, type, n_class) {
  var _values = values.filter(function (v) {
    return v && !isNaN(+v);
  }),
      no_data = values.length - _values.length,
      nb_class = +n_class || getOptNbClass(_values.length);
  var serie = new geostats(_values);
  var breaks = void 0;
  if (type === 'Q6') {
    var tmp = getBreaksQ6(serie.sorted(), serie.precision);
    breaks = tmp.breaks;
    breaks[0] = serie.min();
    breaks[nb_class] = serie.max();
    serie.setClassManually(breaks);
  } else {
    var _func = discretiz_geostats_switch.get(type);
    breaks = serie[_func](nb_class);
    if (serie.precision) breaks = breaks.map(function (val) {
      return round_value(val, serie.precision);
    });
  }
  return [serie, breaks, nb_class, no_data];
}

function discretize_to_size(values, type, nb_class, min_size, max_size) {
  var _getBreaks = getBreaks(values, type, nb_class),
      _getBreaks2 = _slicedToArray(_getBreaks, 3),
      serie = _getBreaks2[0],
      breaks = _getBreaks2[1],
      n_class = _getBreaks2[2];

  var step = (max_size - min_size) / (n_class - 1),
      class_size = Array(n_class).fill(0).map(function (d, i) {
    return min_size + i * step;
  }),
      breaks_prop = [];

  for (var i = 0; i < breaks.length - 1; ++i) {
    breaks_prop.push([[breaks[i], breaks[i + 1]], class_size[i]]);
  }
  return [n_class, type, breaks_prop, serie];
}

var discretize_to_colors = function discretize_to_colors(values, type, nb_class, col_ramp_name) {
  var name_col_ramp = col_ramp_name || 'Reds';

  var _getBreaks3 = getBreaks(values, type, nb_class),
      _getBreaks4 = _slicedToArray(_getBreaks3, 4),
      serie = _getBreaks4[0],
      breaks = _getBreaks4[1],
      n_class = _getBreaks4[2],
      nb_no_data = _getBreaks4[3],
      color_array = getColorBrewerArray(n_class, name_col_ramp),
      no_data_color = nb_no_data > 0 ? '#e7e7e7' : null,
      colors_map = [];

  for (var j = 0; j < values.length; ++j) {
    if (values[j] != null && values[j] != '' && !isNaN(+values[j])) {
      var idx = serie.getClass(values[j]);
      colors_map.push(color_array[idx]);
    } else {
      colors_map.push(no_data_color);
    }
  }
  return [n_class, type, breaks, color_array, colors_map, no_data_color];
}.memoize();

var display_discretization = function display_discretization(layer_name, field_name, nb_class, options) {
  var make_no_data_section = function make_no_data_section() {
    var section = d3.select('#color_div').append('div').attr('id', 'no_data_section').append('p').html(i18next.t('disc_box.withnodata', { count: +no_data }));

    section.append('input').attrs({ type: 'color', value: '#ebebcd', id: 'no_data_color' }).style('margin', '0px 10px');
  };

  var make_sequ_button = function make_sequ_button() {
    var col_div = d3.select('#color_div');
    col_div.selectAll('.color_params').remove();
    col_div.selectAll('.color_txt').remove();
    col_div.selectAll('.color_txt2').remove();
    col_div.selectAll('.central_class').remove();
    col_div.selectAll('.central_color').remove();
    col_div.selectAll('#reverse_pal_btn').remove();
    document.getElementById('button_palette_box').style.display = '';
    var sequential_color_select = col_div.insert('p').attr('class', 'color_txt').style('margin-left', '10px').html(i18next.t('disc_box.color_palette')).insert('select').attr('class', 'color_params').styles({
      width: '116px',
      'background-image': 'url(/static/img/palettes/Blues.png)' }).on('change', function () {
      this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)';
      redisplay.draw();
    });

    ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'].forEach(function (name) {
      sequential_color_select.append('option').text(name).attrs({ value: name, title: name }).styles({ 'background-image': 'url(/static/img/palettes/' + name + '.png)' });
    });

    if (_app.custom_palettes) {
      var additional_colors = Array.from(_app.custom_palettes.entries());

      for (var ixp = 0; ixp < additional_colors.length; ixp++) {
        sequential_color_select.append('option').text(additional_colors[ixp][0]).attrs({ value: 'user_' + additional_colors[ixp][0], title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length }).property('disabled', additional_colors[ixp][1].length !== nb_class);
      }
    }

    var button_reverse = d3.select('.color_txt').insert('p').style('text-align', 'center').insert('button').styles({ 'margin-top': '10px' }).attrs({ class: 'button_st3', id: 'reverse_pal_btn' }).html(i18next.t('disc_box.reverse_palette')).on('click', function () {
      to_reverse = true;
      redisplay.draw();
    });
  };

  var make_diverg_button = function make_diverg_button() {
    var col_div = d3.select('#color_div');
    col_div.selectAll('.color_params').remove();
    col_div.selectAll('.color_txt').remove();
    col_div.selectAll('.color_txt2').remove();
    col_div.selectAll('#reverse_pal_btn').remove();
    document.getElementById('button_palette_box').style.display = 'none';
    col_div.insert('p').attr('class', 'central_class').html(i18next.t('disc_box.break_on')).insert('input').style('width', '50px').attrs({
      type: 'number',
      class: 'central_class',
      id: 'centr_class',
      min: 1,
      max: nb_class - 1,
      step: 1,
      value: Math.round(nb_class / 2) }).on('change', function () {
      redisplay.draw();
    });

    var pal_names = ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'];
    var left_color_select = col_div.insert('p').attr('class', 'color_txt').style('display', 'inline').html(i18next.t('disc_box.left_colramp')).insert('select').style('width', '116px').attr('class', 'color_params_left').on('change', function () {
      this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)';
      redisplay.draw();
    });
    var right_color_select = col_div.insert('p').styles({ display: 'inline', 'margin-left': '70px' }).attr('class', 'color_txt2').html(i18next.t('disc_box.right_colramp')).insert('select').style('width', '116px').attr('class', 'color_params_right').on('change', function () {
      this.style.backgroundImage = 'url(/static/img/palettes/' + this.value + '.png)';
      redisplay.draw();
    });
    pal_names.forEach(function (name) {
      left_color_select.append('option').attrs({ value: name, title: name }).styles({ 'background-image': 'url(/static/img/palettes/' + name + '.png)' }).text(name);
      right_color_select.append('option').attrs({ value: name, title: name }).styles({ 'background-image': 'url(/static/img/palettes/' + name + '.png)' }).text(name);
    });

    // if (_app.custom_palettes) {
    //   const additional_colors = Array.from(
    //     _app.custom_palettes.entries());
    //   for (let ixp = 0; ixp < additional_colors.length; ixp++) {
    //     left_color_select.append('option')
    //       .text(additional_colors[ixp][0])
    //       .attrs({ value: `user_${additional_colors[ixp][0]}`, title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length })
    //       .property('disabled', additional_colors[ixp][1].length !== nb_class);
    //     right_color_select.append('option')
    //       .text(additional_colors[ixp][0])
    //       .attrs({ value: `user_${additional_colors[ixp][0]}`, title: additional_colors[ixp][0], nb_colors: additional_colors[ixp][1].length })
    //       .property('disabled', additional_colors[ixp][1].length !== nb_class);
    //   }
    // }

    document.getElementsByClassName('color_params_right')[0].selectedIndex = 14;

    var central_color = col_div.insert('p').attr('class', 'central_color');
    central_color.insert('input').attrs({ type: 'checkbox', id: 'central_color_chkbx' }).on('change', function () {
      redisplay.draw();
      if (this.checked) {
        col_div.select('#central_color_val').style('display', '');
      } else {
        col_div.select('#central_color_val').style('display', 'none');
      }
    });
    central_color.select('input').node().checked = true;
    central_color.insert('label').attr('for', 'central_color_chkbx').html(i18next.t('disc_box.colored_central_class'));
    central_color.insert('input').attrs({ type: 'color', id: 'central_color_val', value: '#e5e5e5' }).style('margin', '0px 10px').on('change', redisplay.draw);
  };

  var make_box_histo_option = function make_box_histo_option() {
    var histo_options = newBox.append('div').attrs({ id: 'histo_options', class: 'row equal' }).styles({ margin: '5px 5px 10px 15px', width: '100%' });
    var a = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        b = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        c = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        d = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3');

    a.insert('button').attrs({ class: 'btn_population' }).html(i18next.t('disc_box.disp_rug_pop')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        rug_plot.style('display', 'none');
        rug_plot.classed('active', false);
      } else {
        this.classList.add('active');
        rug_plot.style('display', '');
        rug_plot.classed('active', true);
      }
    });

    b.insert('button').attrs({ class: 'btn_mean' }).html(i18next.t('disc_box.disp_mean')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_mean.style('stroke-width', 0);
        txt_mean.style('fill', 'none');
        line_mean.classed('active', false);
      } else {
        this.classList.add('active');
        line_mean.style('stroke-width', 2);
        txt_mean.style('fill', 'blue');
        line_mean.classed('active', true);
      }
    });

    c.insert('button').attrs({ class: 'btn_median' }).html(i18next.t('disc_box.disp_median')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_median.style('stroke-width', 0).classed('active', false);
        txt_median.style('fill', 'none');
      } else {
        this.classList.add('active');
        line_median.style('stroke-width', 2).classed('active', true);
        txt_median.style('fill', 'darkgreen');
      }
    });

    d.insert('button').attrs({ class: 'btn_stddev' }).html(i18next.t('disc_box.disp_sd')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_std_left.style('stroke-width', 0);
        line_std_left.classed('active', false);
        line_std_right.style('stroke-width', 0);
        line_std_right.classed('active', false);
      } else {
        this.classList.add('active');
        line_std_left.style('stroke-width', 2);
        line_std_left.classed('active', true);
        line_std_right.style('stroke-width', 2);
        line_std_right.classed('active', true);
      }
    });
  };

  var update_nb_class = function update_nb_class(value) {
    txt_nb_class.node().value = value;
    document.getElementById('nb_class_range').value = value;
    nb_class = value;
    var color_select = document.querySelector('.color_params');
    var selected_index = color_select.selectedIndex;
    var select_options = color_select.querySelectorAll('option');
    for (var ixc = 0; ixc < select_options.length; ixc++) {
      if (select_options[ixc].value.startsWith('user_')) {
        select_options[ixc].disabled = nb_class !== +select_options[ixc].getAttribute('nb_colors');
      }
    }
    if (select_options[selected_index].value.startsWith('user_') && select_options[selected_index].getAttribute('nb_colors') !== nb_class) {
      setSelected(color_select, 'Blues');
    }
    // const color_select_left = document.querySelectorAll('.color_params_left > option');
    // const color_select_right = document.querySelectorAll('.color_params_right > option');
    // for (let ixc = 0; ixc < color_select_left.length; ixc++) {
    //   if (color_select_left[ixc].value.startsWith('user_')) {
    //     const is_disabled = (nb_class === +color_select_left[ixc].getAttribute('nb_colors')) ? false : true;
    //     color_select_left[ixc].disabled = is_disabled;
    //     color_select_right[ixc].disabled = is_disabled;
    //   }
    // }
  };

  var update_axis = function update_axis(group) {
    group.call(d3.axisBottom().scale(x).tickFormat(formatCount));
  };

  var update_overlay_elements = function update_overlay_elements() {
    var x_mean = x(mean_serie),
        x_med = x(serie.median()),
        x_std_left = x(mean_serie - stddev_serie),
        x_std_right = x(mean_serie + stddev_serie);
    line_mean.transition().attrs({ x1: x_mean, x2: x_mean });
    txt_mean.transition().attr('x', x_mean);
    line_median.transition().attrs({ x1: x_med, x2: x_med });
    txt_median.transition().attr('x', x_med);
    line_std_left.transition().attrs({ x1: x_std_left, x2: x_std_left });
    line_std_right.transition().attrs({ x1: x_std_right, x2: x_std_right });
    rug_plot.selectAll('.indiv').attrs(function (d) {
      return { x1: x(d.value), x2: x(d.value) };
    });
  };

  var make_overlay_elements = function make_overlay_elements() {
    line_mean = overlay_svg.append('line').attr('class', 'line_mean').attr('x1', x(mean_serie)).attr('y1', 10).attr('x2', x(mean_serie)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'blue', fill: 'none' }).classed('active', false);

    txt_mean = overlay_svg.append('text').attr('y', 0).attr('dy', '0.75em').attr('x', x(mean_serie)).style('fill', 'none').attr('text-anchor', 'middle').text(i18next.t('disc_box.mean'));

    line_median = overlay_svg.append('line').attr('class', 'line_med').attr('x1', x(serie.median())).attr('y1', 10).attr('x2', x(serie.median())).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'darkgreen', fill: 'none' }).classed('active', false);

    txt_median = overlay_svg.append('text').attr('y', 0).attr('dy', '0.75em').attr('x', x(serie.median())).style('fill', 'none').attr('text-anchor', 'middle').text(i18next.t('disc_box.median'));

    line_std_left = overlay_svg.append('line').attr('class', 'lines_std').attr('x1', x(mean_serie - stddev_serie)).attr('y1', 10).attr('x2', x(mean_serie - stddev_serie)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' }).classed('active', false);

    line_std_right = overlay_svg.append('line').attr('class', 'lines_std').attr('x1', x(mean_serie + stddev_serie)).attr('y1', 10).attr('x2', x(mean_serie + stddev_serie)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' }).classed('active', false);

    rug_plot = overlay_svg.append('g').style('display', 'none');
    rug_plot.selectAll('.indiv').data(values.map(function (i) {
      return { value: +i };
    })).enter().insert('line').attrs(function (d) {
      return { class: 'indiv', x1: x(d.value), y1: svg_h - margin.bottom - 10, x2: x(d.value), y2: svg_h - margin.bottom };
    }).styles({ stroke: 'red', fill: 'none', 'stroke-width': 1 });
  };

  var make_summary = function make_summary() {
    var content_summary = make_content_summary(serie);
    newBox.append('div').attr('id', 'summary').styles({ 'font-size': '11px', float: 'right', margin: '10px 10px 0px 10px' }).insert('p').html(['<b>', i18next.t('disc_box.summary'), '</b><br>', content_summary].join(''));
  };

  var redisplay = {
    compute: function compute() {
      var tmp = void 0;
      serie = new geostats(values);
      breaks = [];
      values = serie.sorted();

      if (type === 'Q6') {
        tmp = getBreaksQ6(values, serie.precision);
        // stock_class = tmp.stock_class;
        breaks = tmp.breaks;
        breaks[0] = min_serie;
        breaks[6] = max_serie;
        serie.setClassManually(breaks);
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
      } else if (type === 'stddev_f') {
        tmp = getBreaksStdDev(serie, std_dev_params.share, std_dev_params.role_mean, serie.precision);
        update_nb_class(nb_class = tmp.nb_class);
        breaks = tmp.breaks;
        serie.setClassManually(tmp.breaks);
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
      } else if (type === 'user_defined') {
        tmp = getBreaks_userDefined(serie.sorted(), user_break_list);
        stock_class = tmp.stock_class;
        breaks = tmp.breaks;
        nb_class = tmp.breaks.length - 1;
        update_nb_class(nb_class);

        if (breaks[0] > min_serie) breaks[0] = min_serie;
        if (breaks[nb_class] < max_serie) breaks[nb_class] = max_serie;

        var breaks_serie = breaks.slice();
        if (breaks_serie[0] < min_serie) {
          breaks_serie[0] = min_serie;
        }
        if (breaks_serie[nb_class] > max_serie) {
          breaks_serie[nb_class] = max_serie;
        }
        serie.setClassManually(breaks_serie);
      } else {
        breaks = serie[discretiz_geostats_switch.get(type)](nb_class);
        // if (serie.precision) breaks = breaks.map(val => round_value(val, serie.precision));
        serie.doCount();
        stock_class = Array.prototype.slice.call(serie.counter);
        if (stock_class.length === 0) {
          return;
        }
      }
      // In order to avoid class limit falling out the serie limits with Std class :
      //            breaks[0] = breaks[0] < serie.min() ? serie.min() : breaks[0];
      //            ^^^ well finally not ?
      bins = [];
      for (var i = 0, len = stock_class.length, offset = 0; i < len; i++) {
        var bin = {};
        bin.val = stock_class[i];
        bin.offset = i === 0 ? 0 : bins[i - 1].width + bins[i - 1].offset;
        bin.width = breaks[i + 1] - breaks[i];
        bin.height = bin.val / (breaks[i + 1] - breaks[i]);
        bins[i] = bin;
      }
      return true;
    },
    draw: function draw(provided_colors) {
      // Clean-up previously made histogram :
      newBox.select('#svg_discretization').selectAll('.bar').remove();
      newBox.select('#svg_discretization').selectAll('.text_bar').remove();

      if (!provided_colors) {
        var col_scheme = newBox.select('.color_params_left').node() ? 'diverging' : 'sequential';
        if (col_scheme === 'sequential') {
          if (to_reverse) {
            color_array = color_array.reverse();
            to_reverse = false;
          } else {
            var selected_palette = document.querySelector('.color_params').value;
            if (selected_palette.startsWith('user_')) {
              color_array = _app.custom_palettes.get(selected_palette.slice(5));
            } else {
              color_array = getColorBrewerArray(nb_class, selected_palette);
              color_array = color_array.slice(0, nb_class);
            }
          }
        } else if (col_scheme === 'diverging') {
          var left_palette = document.querySelector('.color_params_left').value,
              right_palette = document.querySelector('.color_params_right').value,
              ctl_class_value = +document.getElementById('centr_class').value,
              ctl_class_color = document.querySelector('.central_color > input').checked ? document.getElementById('central_color_val').value : [];

          var class_right = nb_class - ctl_class_value + 1,
              class_left = ctl_class_value - 1,
              max_col_nb = Math.max(class_right, class_left);

          var right_pal = getColorBrewerArray(max_col_nb, right_palette);
          var left_pal = getColorBrewerArray(max_col_nb, left_palette);

          // Below is for the case if we have displayed the custom palette also
          // for a diverging scheme:
          // let right_pal,
          //   left_pal;
          // if (right_palette.startsWith('user_')) {
          //   right_pal = _app.custom_palettes.get(right_palette.slice(5));
          // } else {
          //   right_pal = getColorBrewerArray(max_col_nb, right_palette);
          // }
          // if (left_palette.startsWith('user_')) {
          //   left_pal = _app.custom_palettes.get(left_palette.slice(5));
          // } else {
          //   left_pal = getColorBrewerArray(max_col_nb, left_palette);
          // }
          right_pal = right_pal.slice(0, class_right);
          left_pal = left_pal.slice(0, class_left).reverse();
          color_array = [].concat(left_pal, ctl_class_color, right_pal);
        }
      } else {
        color_array = provided_colors.slice();
      }
      for (var i = 0, len = bins.length; i < len; ++i) {
        bins[i].color = color_array[i];
      }
      x.domain([breaks[0], breaks[breaks.length - 1]]);
      y.domain([0, d3.max(bins.map(function (d) {
        return d.height + d.height / 3;
      }))]);

      svg_histo.select('.x_axis').transition().call(update_axis);
      update_overlay_elements();

      var xx = d3.scaleLinear().range([0, svg_w]).domain([0, d3.max(bins.map(function (d) {
        return d.offset + d.width;
      }))]);

      var bar = svg_histo.selectAll('.bar').data(bins).enter().append('rect').attrs(function (d, i) {
        return {
          class: 'bar',
          id: 'bar_' + i,
          transform: 'translate(0, -7.5)',
          x: xx(d.offset),
          y: y(d.height) - margin.bottom,
          width: xx(d.width),
          height: svg_h - y(d.height) };
      }).styles(function (d) {
        return {
          fill: d.color,
          opacity: 0.95,
          'stroke-opacity': 1 };
      }).on('mouseover', function () {
        this.parentElement.querySelector('#text_bar_' + this.id.split('_')[1]).style.display = null;
      }).on('mouseout', function () {
        this.parentElement.querySelector('#text_bar_' + this.id.split('_')[1]).style.display = 'none';
      });

      svg_histo.selectAll('.txt_bar').data(bins).enter().append('text').attrs(function (d, i) {
        return {
          id: 'text_bar_' + i,
          class: 'text_bar',
          'text-anchor': 'middle',
          dy: '.75em',
          x: xx(d.offset + d.width / 2),
          y: y(d.height) - margin.top * 2 - margin.bottom - 1.5 };
      }).styles({ color: 'black', cursor: 'default', display: 'none' }).text(function (d) {
        return formatCount(d.val);
      });

      document.getElementById('user_breaks_area').value = breaks.join(' - ');
      return true;
    }
  };

  var modal_box = make_dialog_container('discretiz_charts', [i18next.t('disc_box.title'), ' - ', layer_name, ' - ', field_name].join(''), 'discretiz_charts_dialog');

  var newBox = d3.select('#discretiz_charts').select('.modal-body');
  var db_data = void 0;
  if (result_data.hasOwnProperty(layer_name)) {
    db_data = result_data[layer_name];
  } else if (user_data.hasOwnProperty(layer_name)) {
    db_data = user_data[layer_name];
  } else {
    var layer = svg_map.querySelector('#' + _app.idLayer.get(layer_name));
    db_data = Array.prototype.map.call(layer.children, function (d) {
      return d.__data__.properties;
    });
  }
  var indexes = [];
  var color_array = [],
      nb_values = db_data.length,
      values = [],
      no_data = void 0;

  var type = options.type;

  for (var i = 0; i < nb_values; i++) {
    var value = db_data[i][field_name];
    if (value != null && value !== '' && isFinite(value) && !isNaN(+value)) {
      values.push(+db_data[i][field_name]);
      indexes.push(i);
    }
  }

  if (nb_values === values.length) {
    no_data = 0;
  } else {
    no_data = nb_values - values.length;
    nb_values = values.length;
  }

  var max_nb_class = nb_values > 20 ? 20 : nb_values;
  var serie = new geostats(values),
      breaks = [],
      stock_class = [],
      bins = [],
      user_break_list = null,
      std_dev_params = options.extra_options && options.extra_options.role_mean ? options.extra_options : { role_mean: 'center', share: 1 };

  if (serie.variance() === 0 && serie.stddev() === 0) {
    serie = new geostats(values);
  }

  var min_serie = serie.min();
  var max_serie = serie.max();
  var mean_serie = serie.mean();
  var stddev_serie = serie.stddev();

  values = serie.sorted();

  var available_functions = [[i18next.t('app_page.common.equal_interval'), 'equal_interval'], [i18next.t('app_page.common.quantiles'), 'quantiles'], [i18next.t('app_page.common.stddev_f'), 'stddev_f'], [i18next.t('app_page.common.Q6'), 'Q6'], [i18next.t('app_page.common.arithmetic_progression'), 'arithmetic_progression'], [i18next.t('app_page.common.jenks'), 'jenks']];

  if (!serie._hasZeroValue() && !serie._hasNegativeValue()) {
    available_functions.push([i18next.t('app_page.common.geometric_progression'), 'geometric_progression']);
  }
  var precision_axis = get_precision_axis(min_serie, max_serie, serie.precision);
  var formatCount = d3.format(precision_axis);
  var discretization = newBox.append('div').attr('id', 'discretization_panel').insert('p').insert('select').attr('class', 'params').on('change', function () {
    type = this.value;
    if (type === 'stddev_f') {
      input_section_stddev.style('display', '');
      document.getElementById('nb_class_range').disabled = 'disabled';
      txt_nb_class.style('disabled', 'disabled');
      disc_nb_class.style('display', 'none');
    } else {
      input_section_stddev.style('display', 'none');
      document.getElementById('nb_class_range').disabled = false;
      txt_nb_class.style('disabled', false);
      disc_nb_class.style('display', 'inline');
    }
    if (type === 'Q6') {
      update_nb_class(6);
    }
    redisplay.compute();
    redisplay.draw();
  });

  available_functions.forEach(function (func) {
    discretization.append('option').text(func[0]).attr('value', func[1]);
  });

  var input_section_stddev = d3.select('#discretization_panel').insert('p').styles({ margin: 'auto', display: type === 'stddev_f' ? '' : 'none' });
  input_section_stddev.insert('span').html(i18next.t('disc_box.stddev_share_txt1'));
  input_section_stddev.insert('input').attrs({ type: 'number', min: 0.1, max: 10, step: 0.1, class: 'without_spinner', id: 'stddev_share', value: std_dev_params.share }).styles({ width: '45px', 'margin-left': '10px', 'margin-right': '10px' }).on('change', function () {
    var val = this.value;
    if (val === 0 || val * stddev_serie > max_serie - min_serie || val * stddev_serie * 21 < max_serie - min_serie) {
      // If the new value is too big or too small:
      this.value = std_dev_params.share;
      return;
    }
    std_dev_params.share = val;
    redisplay.compute();
    redisplay.draw();
  });
  input_section_stddev.insert('span').html(i18next.t('disc_box.stddev_share_txt2'));
  var std_dev_mean_choice = input_section_stddev.insert('p').style('margin', 'auto');
  std_dev_mean_choice.insert('p').style('margin', 'auto').html(i18next.t('disc_box.stddev_role_mean'));
  [[i18next.t('disc_box.stddev_center_mean'), 'center'], [i18next.t('disc_box.stddev_break_mean'), 'bound']].forEach(function (el) {
    std_dev_mean_choice.insert('input').attrs({ type: 'radio', name: 'role_mean', value: el[1], id: 'button_stddev_' + el[1] }).on('change', function () {
      std_dev_params.role_mean = this.value;
      redisplay.compute();
      redisplay.draw();
    });
    std_dev_mean_choice.insert('label').style('font-weight', '400').attrs({ for: 'button_stddev_' + el[1] }).html(el[0]);
  });
  document.getElementById('button_stddev_' + std_dev_params.role_mean).checked = true;
  var txt_nb_class = d3.select('#discretization_panel').append('input').attrs({ type: 'number', class: 'without_spinner', min: 2, max: max_nb_class, value: nb_class, step: 1 }).styles({ width: '30px', margin: '0 10px', 'vertical-align': 'calc(20%)' }).on('change', function () {
    var a = disc_nb_class.node();
    a.value = this.value;
    a.dispatchEvent(new Event('change'));
  });

  d3.select('#discretization_panel').append('span').html(i18next.t('disc_box.class'));

  var disc_nb_class = d3.select('#discretization_panel').insert('input').styles({ display: 'inline', width: '60px', 'vertical-align': 'middle', margin: '10px' }).attrs({
    id: 'nb_class_range',
    type: 'range',
    min: 2,
    max: max_nb_class,
    value: nb_class,
    step: 1 }).on('change', function () {
    type = discretization.node().value;
    var old_nb_class = nb_class;
    if (type === 'Q6') {
      update_nb_class(6);
    } else if (type === 'stddev_f') {
      update_nb_class(nb_class);
      return;
    }
    // nb_class = +this.value;
    // txt_nb_class.node().value = nb_class;
    update_nb_class(+this.value);
    var ret_val = redisplay.compute();
    if (!ret_val) {
      this.value = old_nb_class;
      txt_nb_class.node().value = +old_nb_class;
    } else {
      redisplay.draw();
      var ctl_class = document.getElementById('centr_class');
      if (ctl_class) {
        ctl_class.max = nb_class;
        if (ctl_class > nb_class) ctl_class.value = Math.round(nb_class / 2);
      }
    }
  });

  var ref_histo_box = newBox.append('div').attr('id', 'ref_histo_box');
  ref_histo_box.append('div').attr('id', 'inner_ref_histo_box');

  discretization.node().value = type;
  make_summary();
  var refDisplay = prepare_ref_histo(newBox, serie, formatCount);
  refDisplay('histogram');

  var svg_h = h / 5 > 100 ? h / 5 : 100,
      svg_w = window.innerWidth - 40 > 760 ? 760 : window.innerWidth - 40,
      margin = { top: 7.5, right: 30, bottom: 7.5, left: 30 },
      height = svg_h - margin.top - margin.bottom;

  d3.select('#discretiz_charts').select('.modal-dialog').styles({
    width: svg_w + margin.top + margin.bottom + 90 + 'px',
    height: window.innerHeight - 60 + 'px' });

  if (values.length < 500) {
    // Only allow for beeswarm plot if there isn't too many values
    // as it seems to be costly due to the "simulation" + the voronoi
    var current_histo = 'histogram';
    var choice_histo = ref_histo_box.append('p').style('text-align', 'center');
    choice_histo.insert('button').attrs({ id: 'button_switch_plot', class: 'i18n button_st4', 'data-i18n': '[text]disc_box.switch_ref_histo' }).styles({ padding: '3px', 'font-size': '10px' }).html(i18next.t('disc_box.switch_ref_histo')).on('click', function () {
      var str_tr = void 0;
      if (current_histo === 'histogram') {
        refDisplay('box_plot');
        current_histo = 'box_plot';
        str_tr = '_boxplot';
      } else if (current_histo === 'box_plot') {
        refDisplay('beeswarm');
        current_histo = 'beeswarm';
        str_tr = '_beeswarm';
      } else if (current_histo === 'beeswarm') {
        refDisplay('histogram');
        current_histo = 'histogram';
        str_tr = '';
      }
      document.getElementById('ref_histo_title').innerHTML = '<b>' + i18next.t('disc_box.hist_ref_title' + str_tr) + '</b>';
    });
  }
  var div_svg = newBox.append('div').append('svg').attr('id', 'svg_discretization').attr('width', svg_w + margin.left + margin.right).attr('height', svg_h + margin.top + margin.bottom);

  make_box_histo_option();

  var svg_histo = div_svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var x = d3.scaleLinear().domain([min_serie, max_serie]).range([0, svg_w]);

  var y = d3.scaleLinear().range([svg_h, 0]);

  var overlay_svg = div_svg.append('g').attr('transform', 'translate(30, 0)'),
      line_mean = void 0,
      line_std_right = void 0,
      line_std_left = void 0,
      line_median = void 0,
      txt_median = void 0,
      txt_mean = void 0,
      rug_plot = void 0;

  make_overlay_elements();

  svg_histo.append('g').attr('class', 'x_axis').attr('transform', 'translate(0,' + height + ')').call(d3.axisBottom().scale(x).tickFormat(formatCount));

  var b_accordion_colors = newBox.append('button').attrs({ class: 'accordion_disc active', id: 'btn_acc_disc_color' }).style('padding', '0 6px').html(i18next.t('disc_box.title_color_scheme'));
  var accordion_colors = newBox.append('div').attrs({ class: 'panel show', id: 'accordion_colors' }).style('width', '98%');
  var color_scheme = accordion_colors // d3.select('#accordion_colors')
  .append('div').attr('id', 'color_div').style('text-align', 'center');

  [[i18next.t('disc_box.sequential'), 'sequential'], [i18next.t('disc_box.diverging'), 'diverging']].forEach(function (el) {
    color_scheme.insert('label').style('margin', '20px').html(el[0]).insert('input').attrs({ type: 'radio', name: 'color_scheme', value: el[1], id: 'button_' + el[1] }).on('change', function () {
      if (this.value === 'sequential') {
        make_sequ_button();
      } else {
        make_diverg_button();
      }
      redisplay.draw();
    });
  });
  var to_reverse = false;
  document.getElementById('button_sequential').checked = true;
  accordion_colors.append('span').attr('id', 'button_palette_box').styles({
    margin: '5px',
    float: 'right',
    cursor: 'pointer'
  }).html(i18next.t('app_page.palette_box.button')).on('click', function () {
    make_box_custom_palette(nb_class).then(function (result) {
      if (result) {
        var _result = _slicedToArray(result, 2),
            colors = _result[0],
            palette_name = _result[1];

        var select_palette = document.querySelector('.color_params');
        addNewCustomPalette(palette_name, colors);
        if (select_palette) {
          d3.select(select_palette).append('option').text(palette_name).attrs({ value: 'user_' + palette_name, title: palette_name, nb_colors: colors.length });
          setSelected(select_palette, 'user_' + palette_name);
        }
        // else {
        //   d3.select('.color_params_right')
        //     .append('option')
        //     .text(palette_name)
        //     .attrs({ value: `user_${palette_name}`, title: palette_name, nb_colors: colors.length });
        //   d3.select('.color_params_left')
        //     .append('option')
        //     .text(palette_name)
        //     .attrs({ value: `user_${palette_name}`, title: palette_name, nb_colors: colors.length });
        // }
      }
    });
  });

  var b_accordion_breaks = newBox.append('button').attrs({ class: 'accordion_disc', id: 'btn_acc_disc_break' }).style('padding', '0 6px').html(i18next.t('disc_box.title_break_values'));
  var accordion_breaks = newBox.append('div').attrs({ class: 'panel', id: 'accordion_breaks_vals' }).style('width', '98%');
  var user_defined_breaks = accordion_breaks.append('div').attr('id', 'user_breaks');

  user_defined_breaks.insert('textarea').attr('id', 'user_breaks_area').attr('placeholder', i18next.t('app_page.common.expected_class')).style('width', '600px');

  user_defined_breaks.insert('button').text(i18next.t('app_page.common.valid')).on('click', function () {
    var old_nb_class = nb_class;
    user_break_list = document.getElementById('user_breaks_area').value;
    type = 'user_defined';
    // nb_class = user_break_list.split('-').length - 1;
    // txt_nb_class.node().value = +nb_class;
    // txt_nb_class.html(i18next.t("disc_box.class", {count: +nb_class}));
    // document.getElementById("nb_class_range").value = nb_class;
    redisplay.compute();
    redisplay.draw();
  });

  accordionize('.accordion_disc', d3.select('#discretiz_charts').node());

  if (no_data > 0) {
    make_no_data_section();
    if (options.no_data) {
      document.getElementById('no_data_color').value = options.no_data;
    }
  }

  if (!options.schema) {
    make_sequ_button();
  } else if (options.schema.length === 1) {
    make_sequ_button();
    document.querySelector('.color_params').value = options.schema[0];
    document.querySelector('.color_params').style.backgroundImage = 'url(/static/img/palettes/' + options.schema[0] + '.png)';
  } else if (options.schema.length > 1) {
    make_diverg_button();
    document.getElementById('button_diverging').checked = true;
    var tmp = 0;
    setSelected(document.querySelector('.color_params_left'), options.schema[0]);
    // document.querySelector(".color_params_left").value = options.schema[0];
    if (options.schema.length > 2) {
      var elem = document.getElementById('central_color_val');
      elem.style.display = '';
      elem.value = options.schema[1];
      tmp = 1;
      document.querySelector('.central_color').querySelector('input').checked = true;
    } else {
      document.querySelector('.central_color').querySelector('input').checked = false;
    }
    setSelected(document.querySelector('.color_params_right'), options.schema[1 + tmp]);
    // document.querySelector(".color_params_right").value = options.schema[1 + tmp];
  }

  if (options.type && options.type === 'user_defined') {
    user_break_list = options.breaks;
  }

  redisplay.compute();
  redisplay.draw(options.colors);

  var deferred = Promise.pending(),
      container = document.getElementById('discretiz_charts');

  container.querySelector('.btn_ok').onclick = function () {
    breaks = breaks.map(function (i) {
      return +i;
    });
    var colors_map = [];
    var no_data_color = null;
    if (no_data > 0) {
      no_data_color = document.getElementById('no_data_color').value;
    }
    for (var j = 0; j < db_data.length; ++j) {
      var _value = db_data[j][field_name];
      if (_value !== null && isFinite(_value) && _value != '' && !isNaN(+_value)) {
        var idx = serie.getClass(+_value);
        colors_map.push(color_array[idx]);
      } else {
        colors_map.push(no_data_color);
      }
    }
    var col_schema = [];
    if (!d3.select('.color_params_left').node()) {
      col_schema.push(document.querySelector('.color_params').value);
    } else {
      col_schema.push(document.querySelector('.color_params_left').value);
      if (document.querySelector('.central_color').querySelector('input').checked) {
        col_schema.push(document.getElementById('central_color_val').value);
      }
      col_schema.push(document.querySelector('.color_params_right').value);
    }
    deferred.resolve([nb_class, type, breaks, color_array, colors_map, col_schema, no_data_color, type === 'stddev_f' ? std_dev_params : undefined]);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  var _onclose = function _onclose() {
    deferred.resolve(false);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  var helper_esc_key_twbs = function helper_esc_key_twbs(evt) {
    var _event = evt || window.event;
    var isEscape = 'key' in _event ? _event.key === 'Escape' || _event.key === 'Esc' : _event.keyCode === 27;
    if (isEscape) {
      _event.stopPropagation();
      _onclose();
    }
  };
  document.addEventListener('keydown', helper_esc_key_twbs);
  overlay_under_modal.display();
  return deferred.promise;
};

function fetch_categorical_colors() {
  var categ = document.getElementsByClassName('typo_class'),
      color_map = new Map();
  for (var i = 0; i < categ.length; i++) {
    var color = rgb2hex(categ[i].querySelector('.color_square').style.backgroundColor),
        new_name = categ[i].querySelector('.typo_name').value,
        nb_features = categ[i].querySelector('.typo_count_ft').getAttribute('data-count');
    color_map.set(categ[i].__data__.name, [color, new_name, nb_features]);
  }
  return color_map;
}

function display_categorical_box(data_layer, layer_name, field, cats) {
  var nb_features = current_layers[layer_name].n_features;
  var nb_class = cats.length;
  var modal_box = make_dialog_container('categorical_box', i18next.t('app_page.categorical_box.title', { layer: layer_name, nb_features: nb_features }), 'dialog');

  var newbox = d3.select('#categorical_box').select('.modal-body').styles({ 'overflow-y': 'scroll', 'max-height': window.innerHeight - 145 + 'px' });

  newbox.append('h3').html('');
  newbox.append('p').html(i18next.t('app_page.symbol_typo_box.field_categ', { field: field, nb_class: +nb_class, nb_features: +nb_features }));

  newbox.append('ul').style('padding', 'unset').attr('id', 'sortable_typo_name').selectAll('li').data(cats).enter().append('li').styles({ margin: 'auto', 'list-style': 'none' }).attr('class', 'typo_class').attr('id', function (d, i) {
    return ['line', i].join('_');
  });

  newbox.selectAll('.typo_class').append('input').styles({ width: '140px', height: 'auto', display: 'inline-block', 'vertical-align': 'middle', 'margin-right': '20px' }).attrs(function (d) {
    return { class: 'typo_name', value: d.display_name, id: d.name };
  });

  newbox.selectAll('.typo_class').insert('p').attr('class', 'color_square').style('background-color', function (d) {
    return d.color;
  }).styles({ width: '22px',
    height: '22px',
    margin: 'auto',
    display: 'inline-block',
    'vertical-align': 'middle',
    'border-radius': '10%' }).on('click', function () {
    var self = this;
    var this_color = self.style.backgroundColor;
    var input_col = document.createElement('input');
    input_col.setAttribute('type', 'color');
    input_col.setAttribute('value', rgb2hex(this_color));
    input_col.className = 'color_input';
    input_col.onchange = function (change) {
      self.style.backgroundColor = hexToRgb(change.target.value, 'string');
    };
    input_col.dispatchEvent(new MouseEvent('click'));
  });

  newbox.selectAll('.typo_class').insert('span').attrs(function (d) {
    return { class: 'typo_count_ft', 'data-count': d.nb_elem };
  }).html(function (d) {
    return i18next.t('app_page.symbol_typo_box.count_feature', { nb_features: +d.nb_elem });
  });

  newbox.insert('p').insert('button').attr('class', 'button_st3').html(i18next.t('app_page.categorical_box.new_random_colors')).on('click', function () {
    var lines = document.getElementsByClassName('typo_class');
    for (var i = 0; i < lines.length; ++i) {
      lines[i].querySelector('.color_square').style.backgroundColor = randomColor();
    }
  });

  new Sortable(document.getElementById('sortable_typo_name'));

  var deferred = Promise.pending();
  var container = document.getElementById('categorical_box');
  var _onclose = function _onclose() {
    deferred.resolve(false);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  container.querySelector('.btn_ok').onclick = function () {
    var color_map = fetch_categorical_colors();
    var colorByFeature = data_layer.map(function (ft) {
      return color_map.get(ft[field])[0];
    });
    deferred.resolve([nb_class, color_map, colorByFeature]);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent();
    if (!p) overlay_under_modal.hide();
  };

  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  function helper_esc_key_twbs(evt) {
    var _event = evt || window.event;
    var isEscape = 'key' in _event ? _event.key === 'Escape' || _event.key === 'Esc' : _event.keyCode === 27;
    if (isEscape) {
      _event.stopPropagation();
      _onclose();
    }
  }
  document.addEventListener('keydown', helper_esc_key_twbs);
  overlay_under_modal.display();
  return deferred.promise;
}

function reOpenParent(css_selector) {
  var parent_style_box = css_selector !== undefined ? document.querySelector(css_selector) : document.querySelector('.styleBox');
  if (parent_style_box && parent_style_box.modal && parent_style_box.modal.show) {
    parent_style_box.modal.show();
    return true;
  }
  return false;
}

var prepare_ref_histo = function prepare_ref_histo(parent_node, serie, formatCount) {
  var svg_h = h / 7.25 > 80 ? h / 7.25 : 80,
      svg_w = w / 4 > 320 ? 320 : w / 4,
      values = serie.sorted(),
      nb_bins = values.length / 3 > 51 ? 50 : Math.ceil(Math.sqrt(values.length)) + 1;

  var q5 = serie.getQuantile(4).map(function (v) {
    return +v;
  });

  var m_margin = { top: 10, right: 20, bottom: 10, left: 20 },
      m_width = svg_w - m_margin.right - m_margin.left,
      m_height = svg_h - m_margin.top - m_margin.bottom;

  var ref_histo = parent_node.select('#ref_histo_box').select('#inner_ref_histo_box');

  ref_histo.append('p').attrs({ id: 'ref_histo_title' }).styles({ margin: 'auto', 'text-align': 'center' }).html('<b>' + i18next.t('disc_box.hist_ref_title') + '</b>');

  var c = ref_histo.append('svg').attr('id', 'svg_ref_histo').attr('width', svg_w + m_margin.left + m_margin.right).attr('height', svg_h + m_margin.top + m_margin.bottom);

  var x = d3.scaleLinear().domain([serie.min(), serie.max()]).rangeRound([0, m_width]);

  var svg_ref_histo = c.append('g').attr('transform', 'translate(' + (m_margin.left + m_margin.right) + ',' + m_margin.top + ')');

  return function (type) {
    svg_ref_histo.remove();
    svg_ref_histo = c.append('g').attr('transform', 'translate(' + (m_margin.left + m_margin.right) + ',' + m_margin.top + ')');
    if (type === 'histogram') {
      var data = d3.histogram().domain(x.domain()).thresholds(x.ticks(nb_bins))(values);

      var y = d3.scaleLinear().domain([0, d3.max(data, function (d) {
        return d.length;
      })]).range([m_height, 0]);

      var bar = svg_ref_histo.selectAll('.bar').data(data).enter().append('rect').attrs(function (d) {
        return {
          class: 'bar',
          width: Math.abs(x(d.x1)) - Math.abs(x(d.x0)),
          height: m_height - y(d.length),
          x: 0,
          transform: 'translate(' + x(d.x0) + ',' + y(d.length) + ')' };
      }).styles({ fill: 'beige', stroke: 'black', 'stroke-width': '0.4px' });

      svg_ref_histo.append('g').style('font-size', '10px').attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' }).call(d3.axisBottom().scale(x).ticks(4).tickFormat(formatCount)).selectAll('text').attr('y', 4).attr('x', -4).attr('dy', '.45em').attr('transform', 'rotate(-40)').style('text-anchor', 'end');

      svg_ref_histo.append('g').attr('class', 'y_axis').style('font-size', '10px').call(d3.axisLeft().scale(y).ticks(5).tickFormat(d3.format('.0f')));
    } else if (type === 'box_plot') {
      svg_ref_histo.append('g').style('font-size', '10px').attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' }).call(d3.axisBottom().scale(x).ticks(4).tickFormat(formatCount)).selectAll('text').attr('y', 4).attr('x', -4).attr('dy', '.45em').attr('transform', 'rotate(-40)').style('text-anchor', 'end');

      var y_mid = (m_margin.top + m_height - m_margin.bottom) / 2;

      svg_ref_histo.append('g').insert('line').attrs({ x1: x(q5[0]), y1: m_margin.top * 2, x2: x(q5[0]), y2: m_height - m_margin.bottom * 2 }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g').insert('rect').attrs({ x: x(q5[1]), y: m_margin.top, width: x(q5[2]) - x(q5[1]), height: m_height - m_margin.bottom - m_margin.top }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'lightblue' });

      svg_ref_histo.append('g').insert('line').attrs({ x1: x(q5[2]), y1: m_margin.top, x2: x(q5[2]), y2: m_height - m_margin.bottom }).styles({ 'stroke-width': 3, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g').insert('rect').attrs({ x: x(q5[2]), y: m_margin.top, width: x(q5[3]) - x(q5[2]), height: m_height - m_margin.bottom - m_margin.top }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'lightblue' });

      svg_ref_histo.append('g').insert('line').attrs({ x1: x(q5[4]), y1: m_margin.top * 2, x2: x(q5[4]), y2: m_height - m_margin.bottom * 2 }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'none' });

      svg_ref_histo.append('g').insert('line').attrs({ x1: x(q5[0]), y1: y_mid, x2: x(q5[1]), y2: y_mid }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'none', 'stroke-dasharray': '3,3' });

      svg_ref_histo.append('g').insert('line').attrs({ x1: x(q5[3]), y1: y_mid, x2: x(q5[4]), y2: y_mid }).styles({ 'stroke-width': 1, stroke: 'black', fill: 'none', 'stroke-dasharray': '3,3' });
    } else if (type === 'beeswarm') {
      var _data = values.map(function (v) {
        return { value: +v };
      });

      var simulation = d3.forceSimulation(_data).force('x', d3.forceX(function (d) {
        return x(d.value);
      }).strength(1)).force('y', d3.forceY(m_height / 2).strength(2)).force('collide', d3.forceCollide(4)).stop();

      for (var i = 0; i < 75; ++i) {
        simulation.tick();
      }
      svg_ref_histo.append('g').style('font-size', '10px').attrs({ class: 'x_axis', transform: 'translate(0,' + m_height + ')' }).call(d3.axisBottom().scale(x).ticks(4).tickFormat(formatCount)).selectAll('text').attr('y', 4).attr('x', -4).attr('dy', '.45em').attr('transform', 'rotate(-40)').style('text-anchor', 'end');

      var cell = svg_ref_histo.append('g').attr('class', 'cells').selectAll('g').data(d3.voronoi().extent([[0, 0], [m_width, m_height]]).x(function (d) {
        return d.x;
      }).y(function (d) {
        return d.y;
      }).polygons(_data)).enter().append('g');

      cell.append('circle').attrs(function (d) {
        if (d) {
          return {
            r: _data.lenght < 250 ? 2.5 : _data.lenght < 500 ? 1.5 : 1,
            transform: 'translate(' + d.data.x + ',' + d.data.y + ')' };
        }
        return undefined;
      });

      cell.append('path').attr('d', function (d) {
        if (d) return 'M' + d.join('L') + 'Z';
        return undefined;
      });
    }
  };
};

function make_box_custom_palette(nb_class, existing_colors) {
  var is_hex_color = new RegExp(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  var is_ok_name = new RegExp(/^[a-zA-Z0-9_]*$/);
  var existing_palette = Array.from(_app.custom_palettes.keys());
  var pal_name = void 0;
  var ref_colors = void 0;
  if (existing_colors && existing_colors.length === nb_class) {
    ref_colors = existing_colors.slice();
  } else {
    ref_colors = [];
    for (var i = 0; i < nb_class; i++) {
      ref_colors.push(randomColor());
    }
  }

  var verif_palette_name = function verif_palette_name(name) {
    if (name !== '' && is_ok_name.test(name)) {
      if (existing_palette.indexOf(name) > -1) {
        d3.select('#palette_box_error_zone').html(i18next.t('app_page.palette_box.error_name_existing'));
        document.querySelector('.swal2-confirm').disabled = true;
        return null;
      }
      d3.select('#palette_box_error_zone').html('');
      document.querySelector('.swal2-confirm').disabled = false;
      return name;
    } else {
      d3.select('#palette_box_error_zone').html(i18next.t('app_page.palette_box.error_name_invalid'));
      document.querySelector('.swal2-confirm').disabled = true;
      return null;
    }
  };

  return swal({
    title: i18next.t('app_page.palette_box.title'),
    html: '<div id="palette_box_content" style="display: inline-flex;"></div><div id="palette_box_name"></div>',
    showCancelButton: true,
    showConfirmButton: true,
    cancelButtonText: i18next.t('app_page.common.close'),
    animation: 'slide-from-top',
    onOpen: function onOpen() {
      document.querySelector('.swal2-modal').style.width = nb_class * 85 + 'px';
      var colors = d3.select('#palette_box_content');
      var g = colors.selectAll('p').data(ref_colors).enter().append('p');

      g.append('input').attr('id', function (d, i) {
        return i;
      }).attr('type', 'color').property('value', function (d) {
        return d;
      }).style('width', '60px').on('change', function (d, i) {
        ref_colors[i] = this.value;
        this.nextSibling.value = this.value;
      });

      g.append('input').attr('id', function (d, i) {
        return i;
      }).property('value', function (d) {
        return d;
      }).style('width', '60px').on('keyup', function (d, i) {
        if (is_hex_color.test(this.value)) {
          ref_colors[i] = this.value;
          this.previousSibling.value = this.value;
        }
      });
      var bottom = d3.select('#palette_box_name');
      bottom.append('p').attr('id', 'palette_box_error_zone').style('background', '#e3e3e3');
      bottom.append('span').html(i18next.t('app_page.palette_box.new_name'));
      bottom.append('input').style('width', '70px').on('keyup', function () {
        if (verif_palette_name(this.value) !== null) pal_name = this.value;
      });
      document.querySelector('.swal2-confirm').disabled = true;
    }
  }).then(function (v) {
    return [ref_colors, pal_name];
  }, function (dismissValue) {
    return null;
  });
}
'use strict';

var display_discretization_links_discont = function display_discretization_links_discont(layer_name, field_name, nb_class, type) {
  var make_box_histo_option = function make_box_histo_option() {
    var histo_options = newBox.append('div').attrs({ id: 'histo_options', class: 'row equal' }).styles({ margin: '5px 5px 10px 15px', width: '100%' });
    var a = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        b = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        c = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3'),
        d = histo_options.append('div').attr('class', 'col-xs-6 col-sm-3');

    a.insert('button').attrs({ class: 'btn_population' }).html(i18next.t('disc_box.disp_rug_pop')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        rug_plot.style('display', 'none');
        rug_plot.classed('active', false);
      } else {
        this.classList.add('active');
        rug_plot.style('display', '');
        rug_plot.classed('active', true);
      }
    });

    b.insert('button').attrs({ class: 'btn_mean' }).html(i18next.t('disc_box.disp_mean')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_mean.style('stroke-width', 0);
        txt_mean.style('fill', 'none');
        line_mean.classed('active', false);
      } else {
        this.classList.add('active');
        line_mean.style('stroke-width', 2);
        txt_mean.style('fill', 'blue');
        line_mean.classed('active', true);
      }
    });

    c.insert('button').attrs({ class: 'btn_median' }).html(i18next.t('disc_box.disp_median')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_median.style('stroke-width', 0).classed('active', false);
        txt_median.style('fill', 'none');
      } else {
        this.classList.add('active');
        line_median.style('stroke-width', 2).classed('active', true);
        txt_median.style('fill', 'darkgreen');
      }
    });

    d.insert('button').attrs({ class: 'btn_stddev' }).html(i18next.t('disc_box.disp_sd')).on('click', function () {
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        line_std_left.style('stroke-width', 0);
        line_std_left.classed('active', false);
        line_std_right.style('stroke-width', 0);
        line_std_right.classed('active', false);
      } else {
        this.classList.add('active');
        line_std_left.style('stroke-width', 2);
        line_std_left.classed('active', true);
        line_std_right.style('stroke-width', 2);
        line_std_right.classed('active', true);
      }
    });
  };

  var make_overlay_elements = function make_overlay_elements() {
    var mean_val = serie.mean(),
        stddev = serie.stddev();

    line_mean = overlay_svg.append('line').attr('class', 'line_mean').attr('x1', x(mean_val)).attr('y1', 10).attr('x2', x(mean_val)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'blue', fill: 'none' }).classed('active', false);

    txt_mean = overlay_svg.append('text').attr('y', 0).attr('dy', '0.75em').attr('x', x(mean_val)).style('fill', 'none').attr('text-anchor', 'middle').text(i18next.t('disc_box.mean'));

    line_median = overlay_svg.append('line').attr('class', 'line_med').attr('x1', x(serie.median())).attr('y1', 10).attr('x2', x(serie.median())).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'darkgreen', fill: 'none' }).classed('active', false);

    txt_median = overlay_svg.append('text').attr('y', 0).attr('dy', '0.75em').attr('x', x(serie.median())).style('fill', 'none').attr('text-anchor', 'middle').text(i18next.t('disc_box.median'));

    line_std_left = overlay_svg.append('line').attr('class', 'lines_std').attr('x1', x(mean_val - stddev)).attr('y1', 10).attr('x2', x(mean_val - stddev)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' }).classed('active', false);

    line_std_right = overlay_svg.append('line').attr('class', 'lines_std').attr('x1', x(mean_val + stddev)).attr('y1', 10).attr('x2', x(mean_val + stddev)).attr('y2', svg_h - margin.bottom).styles({ 'stroke-width': 0, stroke: 'grey', fill: 'none' }).classed('active', false);

    rug_plot = overlay_svg.append('g').style('display', 'none');
    rug_plot.selectAll('.indiv').data(values.map(function (i) {
      return { value: +i };
    })).enter().insert('line').attrs(function (d) {
      return { class: 'indiv', x1: x(d.value), y1: svg_h - margin.bottom - 10, x2: x(d.value), y2: svg_h - margin.bottom };
    }).styles({ stroke: 'red', fill: 'none', 'stroke-width': 1 });
  };

  var make_summary = function make_summary() {
    var content_summary = make_content_summary(serie);
    newBox.append('div').attr('id', 'summary').styles({
      'margin-left': '25px',
      'margin-right': '50px',
      'font-size': '10px',
      float: 'right' }).insert('p').html(['<b>', i18next.t('disc_box.summary'), '</b><br>', content_summary].join(''));
  };

  var update_breaks = function update_breaks(user_defined) {
    if (!user_defined) {
      make_min_max_tableau(values, nb_class, type, last_min, last_max, 'sizes_div', undefined, callback);
    }
    var tmp_breaks = fetch_min_max_table_value('sizes_div');
    var len_breaks = tmp_breaks.sizes.length;
    breaks_info = [];
    last_min = tmp_breaks.sizes[0];
    last_max = tmp_breaks.sizes[tmp_breaks.sizes.length - 1];
    if (+tmp_breaks.mins[0] > +serie.min()) {
      nb_class += 1;
      txt_nb_class.node().value = nb_class;
      // txt_nb_class.html(i18next.t("disc_box.class", {count: nb_class}));
      breaks_info.push([[serie.min(), +tmp_breaks.mins[0]], 0]);
    }

    for (var i = 0; i < len_breaks; i++) {
      breaks_info.push([[tmp_breaks.mins[i], tmp_breaks.maxs[i]], tmp_breaks.sizes[i]]);
    }
    breaks = [breaks_info[0][0][0]].concat(breaks_info.map(function (ft) {
      return ft[0][1];
    }));
    if (user_defined) {
      make_min_max_tableau(null, nb_class, type, last_min, last_max, 'sizes_div', breaks_info, callback);
    }
  };

  var redisplay = {
    compute: function compute() {
      bins = [];
      for (var i = 0, len = breaks_info.length; i < len; i++) {
        var bin = {};
        bin.offset = i === 0 ? 0 : bins[i - 1].width + bins[i - 1].offset;
        bin.width = breaks[i + 1] - breaks[i];
        bin.height = breaks_info[i][1];
        bins[i] = bin;
      }
      return true;
    },
    draw: function draw() {
      // Clean-up previously made histogram :
      d3.select('#svg_discretization').selectAll('.bar').remove();

      for (var i = 0, len = bins.length; i < len; ++i) {
        bins[i].color = array_color[i];
      }

      var x = d3.scaleLinear().domain([serie.min(), serie.max()]).range([0, svg_w]);

      var y = d3.scaleLinear().range([svg_h, 0]);

      x.domain([0, d3.max(bins.map(function (d) {
        return d.offset + d.width;
      }))]);
      y.domain([0, d3.max(bins.map(function (d) {
        return d.height + d.height / 5;
      }))]);

      var bar = svg_histo.selectAll('.bar').data(bins).enter().append('rect').attrs(function (d, i) {
        return {
          class: 'bar',
          id: 'bar_' + i,
          transform: 'translate(0, -17.5)',
          x: x(d.offset),
          y: y(d.height) - margin.bottom,
          width: x(d.width),
          height: svg_h - y(d.height)
        };
      }).styles(function (d) {
        return {
          opacity: 0.95,
          'stroke-opacity': 1,
          fill: d.color
        };
      });

      return true;
    }
  };

  var title_box = [i18next.t('disc_box.title'), ' - ', layer_name, ' - ', field_name].join('');
  var modal_box = make_dialog_container('discretiz_charts', title_box, 'discretiz_charts_dialog');
  var newBox = d3.select('#discretiz_charts').select('.modal-body');
  var db_data = void 0;
  if (result_data.hasOwnProperty(layer_name)) {
    db_data = result_data[layer_name];
  } else if (user_data.hasOwnProperty(layer_name)) {
    db_data = user_data[layer_name];
  }

  var color_array = [];
  var indexes = [];
  var nb_values = db_data.length;
  var values = [];
  var no_data = void 0;

  for (var i = 0; i < nb_values; i++) {
    if (db_data[i][field_name] != null) {
      values.push(+db_data[i][field_name]);
      indexes.push(i);
    }
  }

  if (nb_values === values.length) {
    no_data = 0;
  } else {
    no_data = nb_values - values.length;
    nb_values = values.length;
  }
  var max_nb_class = nb_values > 20 ? 20 : nb_values;
  var sizes = current_layers[layer_name].breaks.map(function (el) {
    return el[1];
  });
  var stock_class = [];
  var serie = new geostats(values),
      breaks_info = [].concat(current_layers[layer_name].breaks),
      breaks = [+breaks_info[0][0][0]],
      bins = [],
      last_min = min_fast(sizes),
      last_max = max_fast(sizes),
      array_color = d3.schemeCategory20.slice();

  breaks_info.forEach(function (elem) {
    breaks.push(elem[0][1]);
  });

  if (serie.variance() === 0 && serie.stddev() === 0) {
    serie = new geostats(values);
  }

  values = serie.sorted();
  //    serie.setPrecision(6);
  var available_functions = [[i18next.t('app_page.common.equal_interval'), 'equal_interval'], [i18next.t('app_page.common.quantiles'), 'quantiles'], [i18next.t('app_page.common.user_defined'), 'user_defined'],
  //     [i18next.t("app_page.common.std_dev"), "std_dev"],
  [i18next.t('app_page.common.Q6'), 'Q6'], [i18next.t('app_page.common.arithmetic_progression'), 'arithmetic_progression'], [i18next.t('app_page.common.jenks'), 'jenks']];

  if (!serie._hasZeroValue() && !serie._hasZeroValue()) {
    available_functions.push([i18next.t('app_page.common.geometric_progression'), 'geometric_progression']);
  }
  var precisionAxis = get_precision_axis(serie.min(), serie.max(), serie.precision);
  var formatCount = d3.format(precisionAxis);

  var discretization = newBox.append('div').attr('id', 'discretization_panel').insert('p').html('Type ').insert('select').attr('class', 'params').on('change', function () {
    var old_type = type;
    if (this.value === 'user_defined') {
      this.value = old_type;
      return;
    }
    type = this.value;
    if (type === 'Q6') {
      nb_class = 6;
      txt_nb_class.node().value = nb_class;
      document.getElementById('nb_class_range').value = 6;
    }
    update_breaks();
    redisplay.compute();
    redisplay.draw();
  });

  available_functions.forEach(function (func) {
    discretization.append('option').text(func[0]).attr('value', func[1]);
  });

  var ref_histo_box = newBox.append('div').attr('id', 'ref_histo_box');
  ref_histo_box.append('div').attr('id', 'inner_ref_histo_box');

  discretization.node().value = type;

  make_summary();

  var refDisplay = prepare_ref_histo(newBox, serie, formatCount);
  refDisplay('histogram');

  if (values.length < 750) {
    // Only allow for beeswarm plot if there isn't too many values
    // as it seems to be costly due to the "simulation" + the voronoi
    var choiceHisto = ref_histo_box.append('p').style('text-align', 'center');
    var currentHisto = 'histogram';
    choiceHisto.insert('button').attrs({ id: 'button_switch_plot', class: 'i18n button_st4', 'data-i18n': '[text]disc_box.switch_ref_histo' }).styles({ padding: '3px', 'font-size': '10px' }).html(i18next.t('disc_box.switch_ref_histo')).on('click', function () {
      if (currentHisto === 'histogram') {
        refDisplay('box_plot');
        currentHisto = 'box_plot';
      } else if (currentHisto === 'box_plot') {
        refDisplay('beeswarm');
        currentHisto = 'beeswarm';
      } else if (currentHisto === 'beeswarm') {
        refDisplay('histogram');
        currentHisto = 'histogram';
      }
    });
  }

  var txt_nb_class = d3.select('#discretization_panel').append('input').attrs({ type: 'number', class: 'without_spinner', min: 2, max: max_nb_class, value: nb_class, step: 1 }).styles({ width: '30px', margin: '0 10px', 'vertical-align': 'calc(20%)' }).on('change', function () {
    var a = disc_nb_class.node();
    a.value = this.value;
    a.dispatchEvent(new Event('change'));
  });

  d3.select('#discretization_panel').append('span').html(i18next.t('disc_box.class'));

  var disc_nb_class = d3.select('#discretization_panel').insert('input').styles({ display: 'inline', width: '60px', 'vertical-align': 'middle', margin: '10px' }).attrs({
    id: 'nb_class_range',
    type: 'range',
    min: 2,
    max: max_nb_class,
    value: nb_class,
    step: 1 }).on('change', function () {
    type = discretization.node().value;
    if (type === 'user_defined') {
      type = 'equal_interval';
      discretization.node().value = 'equal_interval';
    }
    if (type === 'Q6') {
      this.value = 6;
      return;
    }
    nb_class = +this.value;
    txt_nb_class.node().value = nb_class;
    update_breaks();
    redisplay.compute();
    redisplay.draw();
  });

  var svg_h = h / 5 > 90 ? h / 5 : 90,
      svg_w = w - w / 8,
      margin = { top: 17.5, right: 30, bottom: 7.5, left: 30 },
      height = svg_h - margin.top - margin.bottom;

  d3.select('#discretiz_charts').select('.modal-dialog').styles({ width: svg_w + margin.top + margin.bottom + 90 + 'px',
    height: window.innerHeight - 60 + 'px' });

  var div_svg = newBox.append('div').append('svg').attr('id', 'svg_discretization').attr('width', svg_w + margin.left + margin.right).attr('height', svg_h + margin.top + margin.bottom);

  make_box_histo_option();

  var svg_histo = div_svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var x = d3.scaleLinear().domain([serie.min(), serie.max()]).range([0, svg_w]);

  var overlay_svg = div_svg.append('g').attr('transform', 'translate(30, 0)'),
      line_mean = void 0,
      line_std_right = void 0,
      line_std_left = void 0,
      line_median = void 0,
      txt_median = void 0,
      txt_mean = void 0,
      rug_plot = void 0;

  make_overlay_elements();

  // As the x axis and the mean didn't change, they can be drawn only once :
  svg_histo.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(d3.axisBottom().scale(x).tickFormat(formatCount));

  var box_content = newBox.append('div').attr('id', 'box_content');
  box_content.append('h3').style('margin', '0').html(i18next.t('disc_box.line_size'));
  var sizes_div = d3.select('#box_content').append('div').attr('id', 'sizes_div');
  var callback = function callback() {
    discretization.node().value = type;
    update_breaks(true);
    redisplay.compute();
    redisplay.draw();
  };
  make_min_max_tableau(null, nb_class, type, null, null, 'sizes_div', breaks_info, callback);

  redisplay.compute();
  redisplay.draw();

  var deferred = Promise.pending();
  var container = document.getElementById('discretiz_charts');
  var _onclose = function _onclose() {
    deferred.resolve(false);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent('.styleBox');
    if (!p) overlay_under_modal.hide();
  };
  var helper_esc_key_twbs = function helper_esc_key_twbs(evt) {
    var _event = evt || window.event;
    var isEscape = 'key' in _event ? _event.key === 'Escape' || _event.key === 'Esc' : _event.keyCode === 27;
    if (isEscape) {
      _event.preventDefault();
      _onclose();
    }
  };
  container.querySelector('.btn_ok').onclick = function () {
    breaks[0] = serie.min();
    breaks[nb_class] = serie.max();
    deferred.resolve([serie, breaks_info, breaks]);
    document.removeEventListener('keydown', helper_esc_key_twbs);
    container.remove();
    var p = reOpenParent('.styleBox');
    if (!p) overlay_under_modal.hide();
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  document.addEventListener('keydown', helper_esc_key_twbs);
  return deferred.promise;
};
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var get_menu_option = function () {
  var menu_option = {
    smooth: {
      name: 'smooth',
      menu_factory: 'fillMenu_Stewart',
      fields_handler: 'fields_Stewart'
    },
    prop: {
      name: 'prop',
      menu_factory: 'fillMenu_PropSymbol',
      fields_handler: 'fields_PropSymbol'
    },
    choroprop: {
      name: 'choroprop',
      menu_factory: 'fillMenu_PropSymbolChoro',
      fields_handler: 'fields_PropSymbolChoro'
    },
    proptypo: {
      name: 'proptypo',
      menu_factory: 'fillMenu_PropSymbolTypo',
      fields_handler: 'fields_PropSymbolTypo'
    },
    choro: {
      name: 'choro',
      menu_factory: 'fillMenu_Choropleth',
      fields_handler: 'fields_Choropleth'
    },
    cartogram: {
      name: 'cartogram',
      menu_factory: 'fillMenu_Anamorphose',
      fields_handler: 'fields_Anamorphose'
    },
    grid: {
      name: 'grid',
      menu_factory: 'fillMenu_griddedMap',
      fields_handler: 'fields_griddedMap'
    },
    flow: {
      name: 'flow',
      menu_factory: 'fillMenu_FlowMap',
      fields_handler: 'fields_FlowMap'
    },
    discont: {
      name: 'discont',
      menu_factory: 'fillMenu_Discont',
      fields_handler: 'fields_Discont'
    },
    typo: {
      name: 'typo',
      menu_factory: 'fillMenu_Typo',
      fields_handler: 'fields_Typo'
    },
    typosymbol: {
      name: 'typosymbol',
      menu_factory: 'fillMenu_TypoSymbol',
      fields_handler: 'fields_TypoSymbol'
    },
    two_stocks: {
      name: 'two_stocks',
      menu_factory: 'fillMenu_TwoStocks',
      fields_handler: 'fields_TwoStocks'
    }
  };
  return function (func) {
    return menu_option[func.toLowerCase()] || {};
  };
}();

/**
* Remove the div on which we are displaying the options related to each
* kind of rendering.
* @return {void}
*
*/
function clean_menu_function() {
  if (fields_handler && fields_handler.unfill) {
    fields_handler.unfill();
    fields_handler = undefined;
  }
  if (_app.current_functionnality && _app.current_functionnality.name) {
    var previous_button = document.getElementById('button_' + _app.current_functionnality.name);
    if (previous_button.style.filter !== 'grayscale(100%)') {
      previous_button.style.filter = 'invert(0%) saturate(100%)';
    }
    previous_button.classList.remove('active');
    _app.current_functionnality = undefined;
  }
  section2.select('.form-rendering').remove();
  document.getElementById('accordion2b').style.display = 'none';
  var btn_s2b = document.getElementById('btn_s2b');
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
  select_node.innerHTML = ''; // eslint-disable-line no-param-reassign
  // for (let i = select_node.childElementCount - 1; i > -1; i--) {
  //   select_node.removeChild(select_node.children[i]);
  // }
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
  var clean_name = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (clean_name.match(/^\d+/)) {
    clean_name = '_' + clean_name;
  }
  if (!current_layers.hasOwnProperty(clean_name) && ['Graticule', 'World'].indexOf(clean_name) < 0) {
    return clean_name;
  }
  //  else {
  var i = 1;
  var match = clean_name.match(/_\d+$/);
  if (!match) {
    return check_layer_name([clean_name, i].join('_'));
  }
  i = match[0];
  clean_name = clean_name.substring(clean_name, clean_name.indexOf(i));
  return check_layer_name([clean_name, parseInt(i.slice(1, i.length), 10) + 1].join('_'));
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
}

/**
* Display a warning message if the target layer contains
* one or more empty feature(s).
*
* @param {Array} features - the empty features
*
* @return void
*/
function display_warning_empty_geom(features) {
  swal({ title: '',
    text: i18next.t('app_page.common.warning_empty_geom', { count: features.length }),
    type: 'warning',
    showCancelButton: false,
    allowOutsideClick: false,
    confirmButtonColor: '#DD6B55',
    confirmButtonText: i18next.t('app_page.common.valid') + '!'
  });
}

/**
* Return an approximate value (based on the bbox of the targeted layer)
* to fill the "span" field in stewart functionnality
* as well as the "resolution" field in grid functionnality.
*
* @param {String} func_name - the name of the representation for which this function
*                             is called (between 'grid' and 'stewart').
* @return Number - A first guess for the span value (with no decimal if possible)
*/
var get_first_guess_span = function get_first_guess_span(func_name) {
  var bbox = _target_layer_file.bbox,
      layer_name = Object.getOwnPropertyNames(_target_layer_file.objects),
      abs = Math.abs,
      const_mult = func_name === 'grid' ? 0.09 : 0.05;
  var width_km = haversine_dist([bbox[0], abs(bbox[3]) - abs(bbox[1])], [bbox[2], abs(bbox[3]) - abs(bbox[1])]);
  var height_km = haversine_dist([abs(bbox[2]) - abs(bbox[0]), bbox[1]], [abs(bbox[2]) - abs(bbox[0]), bbox[3]]);
  var val = Math.max(width_km, height_km) * const_mult;
  return val > 10 ? Math.round(val / 10) * 10 : Math.round(val);
};

/**
* Check if the wanted resolution isn't too big before sending the request
* to the server.
*
* @param {Number} cell_value - The cell value to test
* @return
*/
function test_maxmin_resolution(cell_value) {
  var bbox = _target_layer_file.bbox;
  var abs = Math.abs;
  var width_km = haversine_dist([bbox[0], abs(bbox[3]) - abs(bbox[1])], [bbox[2], abs(bbox[3]) - abs(bbox[1])]);
  var height_km = haversine_dist([abs(bbox[2]) - abs(bbox[0]), bbox[1]], [abs(bbox[2]) - abs(bbox[0]), bbox[3]]);
  // const area = width_km * height_km;
  var bigger_side = Math.max(height_km, width_km);
  if (width_km * height_km / (cell_value * cell_value) > 15000) {
    return 'higher';
  } else if (cell_value > bigger_side / 1.66) {
    return 'lower';
  }
  // return;
}

/*
* Set the appropriate discretisation icon as selected
*
*/
var color_disc_icons = function () {
  var types = new Set(['q6', 'equal_interval', 'jenks', 'quantiles']);
  return function (type_disc) {
    if (!type_disc) return;
    var t_disc = type_disc.toLowerCase();
    if (types.has(t_disc)) {
      document.getElementById('ico_' + t_disc).style.border = 'solid 1px green';
    }
  };
}();

function make_template_functionnality(parent_node) {
  return parent_node.append('div').attr('class', 'form-rendering');
}

/**
* Make the input element allowing to choose the resulting layer name
* (used for each representation type)
* @param {Object} parent - The parent of the element to be created.
* @param {String} id - the id of the element to be created.
* @param {String} margin_top - The margin on the top of the input element (in px).
* @return {void}
*/
function make_layer_name_button(parent, id, margin_top) {
  var a = parent.append('p').style('clear', 'both');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.output' }).html(i18next.t('app_page.func_options.common.output'));
  a.insert('input').styles({ width: '240px', 'font-size': '11.5px', 'margin-top': margin_top }).attrs({ class: 'params', id: id });
}

function make_discretization_icons(discr_section) {
  var subsection1 = discr_section.append('p');
  subsection1.insert('span').attrs({ 'data-i18n': '[html]app_page.func_options.common.discretization_choice', class: 'i18n' }).html(i18next.t('app_page.func_options.common.discretization_choice'));
  var subsection2 = discr_section.append('p');
  subsection2.append('img').styles({ margin: '0 7.5px', cursor: 'pointer' }).attrs({ src: '/static/img/discr_icons/q6.png', id: 'ico_q6' });
  subsection2.append('img').styles({ margin: '0 7.5px', cursor: 'pointer' }).attrs({ src: '/static/img/discr_icons/jenks.png', id: 'ico_jenks' });
  subsection2.append('img').styles({ margin: '0 7.5px', cursor: 'pointer' }).attrs({ src: '/static/img/discr_icons/equal_intervals.png', id: 'ico_equal_interval' });
  subsection2.append('img').styles({ margin: '0 7.5px', cursor: 'pointer' }).attrs({ src: '/static/img/discr_icons/quantiles.png', id: 'ico_quantiles' });
  subsection2.append('img').styles({ margin: '0 7.5px', cursor: 'pointer' }).attrs({ src: '/static/img/discr_icons/others.png', id: 'ico_others' });
  subsection2.append('span').attrs({ id: 'choro_mini_choice_disc' }).styles({ float: 'right', 'margin-top': '5px', 'margin-left': '15px' });
  subsection2.append('img').styles({ width: '15px', position: 'absolute', right: '5px' }).attrs({ id: 'img_choice_disc', src: '/static/img/Red_x.png' });
}

function make_ok_button(parent, id) {
  var disabled = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  var a = parent.append('p').styles({ 'text-align': 'right', margin: 'auto' });
  a.append('button').attrs({ id: id,
    class: 'params button_st3 i18n',
    'data-i18n': '[html]app_page.func_options.common.render',
    disabled: disabled ? true : null }).html(i18next.t('app_page.func_options.common.render'));
}

function make_min_max_tableau(values, nb_class, discontinuity_type, min_size, max_size, id_parent, breaks, callback) {
  var parent_nd = document.getElementById(id_parent);
  parent_nd.innerHTML = '';

  if (values && breaks === undefined) {
    var disc_result = discretize_to_size(values, discontinuity_type, nb_class, min_size, max_size);
    breaks = disc_result[2]; // eslint-disable-line no-param-reassign
    if (!breaks) return false;
  }

  parent_nd.style.marginTop = '3px';
  parent_nd.style.marginBottom = '3px';
  // parent_nd.style = "margin-top: 3px; margin-bottom: 3px;"

  var title = document.createElement('p');
  // title.style = "margin: 1px; word-spacing: 1.8em;";
  title.style.margin = '1px';
  title.style.wordSpacing = '1.8em';
  title.innerHTML = 'Min - Max - Size';
  parent_nd.appendChild(title);

  var div_table = document.createElement('div');
  parent_nd.appendChild(div_table);
  for (var i = 0; i < breaks.length; i++) {
    var inner_line = document.createElement('p');
    inner_line.setAttribute('class', 'breaks_vals');
    inner_line.id = ['line', i].join('_');
    inner_line.style.margin = '0px';

    var input1 = document.createElement('input');
    input1.setAttribute('type', 'number');
    input1.setAttribute('class', 'min_class');
    input1.setAttribute('step', 'any');
    input1.value = (+breaks[i][0][0]).toFixed(2);
    input1.style.width = '60px';
    input1.style.position = 'unset';
    inner_line.appendChild(input1);

    var input2 = document.createElement('input');
    input2.setAttribute('type', 'number');
    input2.setAttribute('class', 'max_class');
    input2.setAttribute('step', 'any');
    input2.value = (+breaks[i][0][1]).toFixed(2);
    input2.style.width = '60px';
    input2.style.position = 'unset';
    inner_line.appendChild(input2);

    var input3 = document.createElement('input');
    input3.setAttribute('type', 'number');
    input3.setAttribute('class', 'size_class');
    input3.setAttribute('step', 'any');
    input3.value = (+breaks[i][1]).toFixed(2);
    input3.style.marginLeft = '20px';
    input3.style.width = '55px';
    input3.style.position = 'unset';
    inner_line.appendChild(input3);

    var px = document.createElement('span');
    px.innerHTML = ' px';
    inner_line.appendChild(px);
    div_table.appendChild(inner_line);
  }

  var mins = document.getElementById(id_parent).querySelectorAll('.min_class'),
      maxs = document.getElementById(id_parent).querySelectorAll('.max_class');

  for (var _i = 0; _i < mins.length; _i++) {
    if (_i > 0) {
      (function () {
        var prev_ix = _i - 1;
        mins[_i].onchange = function () {
          maxs[prev_ix].value = this.value;
          if (callback) callback();
        };
      })();
    }
    if (_i < mins.length - 1) {
      (function () {
        var next_ix = _i + 1;
        maxs[_i].onchange = function () {
          mins[next_ix].value = this.value;
          if (callback) callback();
        };
      })();
    }
  }
  if (callback) {
    var sizes = document.getElementById(id_parent).querySelectorAll('.size_class');
    for (var _i2 = 0; _i2 < sizes.length; _i2++) {
      sizes[_i2].onchange = callback;
    }
  }
}

function fetch_min_max_table_value(parent_id) {
  var parent_node = void 0;
  if (parent_id) parent_node = document.getElementById(parent_id);else if (_app.current_functionnality.name === 'flow') document.getElementById('FlowMap_discTable');else if (_app.current_functionnality.name === 'discont') document.getElementById('Discont_discTable');else return;

  var mins = Array.prototype.map.call(parent_node.querySelectorAll('.min_class'), function (el) {
    return +el.value;
  }),
      maxs = Array.prototype.map.call(parent_node.querySelectorAll('.max_class'), function (el) {
    return +el.value;
  }),
      sizes = Array.prototype.map.call(parent_node.querySelectorAll('.size_class'), function (el) {
    return +el.value;
  }),
      nb_class = mins.length,
      comp_fun = function comp_fun(a, b) {
    return a - b;
  };

  var r_mins = [].concat(mins);
  var r_maxs = [].concat(maxs);
  var r_sizes = [].concat(sizes);
  var sorted_min = mins.sort(comp_fun);
  var sorted_max = maxs.sort(comp_fun);
  var sorted_sizes = sizes.sort(comp_fun);
  // Some verification regarding the input values provided by the user :
  // - Values are ordered :
  if (!(r_mins.every(function (d, i) {
    return sorted_min[i] === d;
  }) && r_maxs.every(function (d, i) {
    return sorted_max[i] === d;
  }) && r_sizes.every(function (d, i) {
    return sorted_sizes[i] === d;
  }))) {
    swal('', i18next.t('app_page.common.error_values_order'), 'error');
    return false;
  }

  return { mins: sorted_min, maxs: sorted_max, sizes: sorted_sizes };
}

function fillMenu_TwoStocks(layer) {
  var dv2 = make_template_functionnality(section2);

  var f1 = dv2.append('p').attr('class', 'params_section2');
  f1.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.fields' }).html(i18next.t('app_page.func_options.twostocks.fields'));
  f1.insert('select').attrs({ class: 'params', id: 'TwoStocks_fields', multiple: 'multiple', size: 2 });

  // const f2 = dv2.append('p').attr('class', 'params_section2');
  // f2.append('span')
  //   .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.field2' })
  //   .html(i18next.t('app_page.func_options.twostocks.field2'));
  // f2.insert('select')
  //   .attrs({ class: 'params', id: 'TwoStocks_field2' });

  // const a = dv2.append('p').attr('class', 'params_section2');
  // a.append('span')
  //   .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.type' })
  //   .html(i18next.t('app_page.func_options.twostocks.type'));
  // const type_select = a.insert('select')
  //   .attrs({ class: 'params', id: 'TwoStocks_type' });


  // Options for waffles :
  var b = dv2.append('p').attr('class', 'params_section2');
  b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.symbol_choice' }).html(i18next.t('app_page.func_options.twostocks.symbol_choice'));
  b.insert('select').attrs({ class: 'params', id: 'TwoStocks_waffle_symbol' });

  var c = dv2.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.waffle_size_circle', id: 'TwoStocks_waffle_size_txt' }).html(i18next.t('app_page.func_options.twostocks.waffle_size_circle'));
  c.insert('input').attrs({
    id: 'TwoStocks_waffle_size',
    type: 'number',
    class: 'params',
    min: 1,
    max: 20,
    step: 1,
    value: 3
  }).style('width', '50px');
  c.append('span').html(' (px)');

  var d = dv2.append('p').attr('class', 'params_section2');
  d.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.waffle_width_rows' }).html(i18next.t('app_page.func_options.twostocks.waffle_width_rows'));
  d.insert('input').attrs({
    id: 'TwoStocks_waffle_WidthRow',
    class: 'params',
    type: 'number',
    min: 2,
    max: 8,
    value: 2,
    step: 1
  }).style('width', '50px');

  var e = dv2.append('p').attr('class', 'params_section2');
  e.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.waffle_ratio' }).html(i18next.t('app_page.func_options.twostocks.waffle_ratio'));
  e.insert('input').attrs({
    id: 'TwoStocks_waffle_ratio',
    class: 'params',
    type: 'number',
    min: 1,
    max: 1000000,
    value: 100,
    step: 1
  }).style('width', '50px');
  e.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.twostocks.waffle_ratio_units' }).html(i18next.t('app_page.func_options.twostocks.waffle_ratio_units'));

  make_layer_name_button(dv2, 'TwoStocks_output_name', '15px');
  make_ok_button(dv2, 'twoStocks_yes');
  dv2.selectAll('.params').attr('disabled', true);
}

var fields_TwoStocks = {
  fill: function fill(layer) {
    if (!layer) return;
    section2.selectAll('.params').attr('disabled', null);
    var fields_stock = getFieldsType('stock', layer);
    var symbol_choice = section2.select('#TwoStocks_waffle_symbol');
    var fields_list = section2.select('#TwoStocks_fields');
    var ok_button = section2.select('#twoStocks_yes');
    var ratio_select = section2.select('#TwoStocks_waffle_ratio');
    var input_name = section2.select('#TwoStocks_output_name');
    [['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
      symbol_choice.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
    });
    var nb_display_fields = fields_stock.length <= 4 ? fields_stock.length : 4;
    fields_stock.forEach(function (f) {
      fields_list.append('option').text(f).attr('value', f);
    });
    fields_list.node().parentElement.style.marginBottom = nb_display_fields * 16 + 'px';
    fields_list.attr('size', nb_display_fields);
    symbol_choice.on('change', function () {
      if (this.value === 'circle') {
        section2.select('#TwoStocks_waffle_size_txt').attr('data-i18n', '[html]app_page.func_options.twostocks.waffle_size_circle').text(i18next.t('app_page.func_options.twostocks.waffle_size_circle'));
      } else {
        section2.select('#TwoStocks_waffle_size_txt').attr('data-i18n', '[html]app_page.func_options.twostocks.waffle_size_square').text(i18next.t('app_page.func_options.twostocks.waffle_size_square'));
      }
    });
    input_name.node().value = layer + '_Waffle';
    ok_button.on('click', function () {
      var rendering_params = {};
      var new_layer_name = document.getElementById('TwoStocks_output_name').value;
      new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : layer + '_Waffle');
      rendering_params.ratio = +document.getElementById('TwoStocks_waffle_ratio').value;
      rendering_params.fields = Array.prototype.slice.call(fields_list.node().selectedOptions).map(function (elem) {
        return elem.value;
      });

      // Verify that there is 2 or more fields selected :
      if (rendering_params.fields.length < 2) {
        swal({
          title: i18next.t('app_page.common.error') + '!',
          text: '' + i18next.t('app_page.common.error_multiple_fields'),
          customClass: 'swal2_custom',
          type: 'error',
          allowOutsideClick: false
        });
        return;
      }

      // Verify that there isn't too many symbols to draw:
      var t_max = 0;

      var _loop = function _loop(i) {
        var field = rendering_params.fields[i];
        t_max += max_fast(user_data[layer].map(function (obj) {
          return +obj[field];
        })) / rendering_params.ratio;
      };

      for (var i = 0; i < rendering_params.fields.length; i++) {
        _loop(i);
      }

      if (t_max > 900) {
        swal({
          title: i18next.t('app_page.common.error') + '!',
          text: '' + i18next.t('app_page.common.error_waffle_too_many'),
          customClass: 'swal2_custom',
          type: 'error',
          allowOutsideClick: false
        });
        return;
      }

      // Fetch the necessary settings for rendering the waffle map:
      rendering_params.new_name = new_layer_name;
      rendering_params.symbol_type = symbol_choice.node().value;
      rendering_params.size = +document.getElementById('TwoStocks_waffle_size').value;
      rendering_params.nCol = +document.getElementById('TwoStocks_waffle_WidthRow').value;

      render_twostocks_waffle(layer, rendering_params);
      zoom_without_redraw();
      switch_accordion_section();
      handle_legend(new_layer_name);
    });
  },
  unfill: function unfill() {
    unfillSelectInput(document.getElementById('TwoStocks_waffle_symbol'));
    unfillSelectInput(document.getElementById('TwoStocks_fields'));
    unfillSelectInput(document.getElementById('TwoStocks_waffle_ratio'));
    document.getElementById('TwoStocks_fields').size = 2;
    document.getElementById('TwoStocks_fields').parentElement.style.marginBottom = '25px';
    section2.selectAll('.params').attr('disabled', true);
  }
};

function render_twostocks_waffle(layer, rendering_params) {
  var get_colors = function get_colors(nb) {
    var res = [];
    for (var i = 0; i < nb; i++) {
      res.push(randomColor());
    }
    return res;
  };
  var round = Math.round;
  var floor = Math.floor;
  var ratio = rendering_params.ratio,
      symbol_type = rendering_params.symbol_type,
      nCol = rendering_params.nCol,
      fields = rendering_params.fields,
      layer_to_add = rendering_params.new_name;

  var nbVar = fields.length;
  var colors = [];
  var sums = [];
  var ref_colors = void 0;

  var layer_id = encodeId(layer_to_add);
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);

  if (!rendering_params.result_data) {
    ref_colors = get_colors(nbVar);
    result_data[layer_to_add] = [];
    var ref_layer_selection = map.select('#' + _app.layer_to_id.get(layer)).selectAll('path');
    var centroids = getCentroids(ref_layer_selection._groups[0]);
    var empty_geoms = [];

    ref_layer_selection.each(function (d, i) {
      if (!centroids[i]) {
        empty_geoms.push(d);
      } else {
        var r = { id: d.id, centroid: centroids[i] };
        for (var j = 0; j < nbVar; j++) {
          var _field = fields[j];
          r[_field] = +user_data[layer][i][_field];
        }
        result_data[layer_to_add].push(r);
      }
    });
    if (empty_geoms.length > 0) {
      display_warning_empty_geom(empty_geoms);
    }
  } else {
    ref_colors = rendering_params.ref_colors;
    result_data[layer_to_add] = JSON.parse(rendering_params.result_data);
  }

  for (var i = 0, _length = result_data[layer_to_add].length; i < _length; i++) {
    var c = [];
    var sum = 0;
    var color = void 0;
    for (var j = 0; j < nbVar; j++) {
      var val = result_data[layer_to_add][i][fields[j]] / ratio;
      sum += val;
      color = ref_colors[j];
      for (var ix = 0; ix < val; ix++) {
        c.push(color);
      }
    }
    colors.push(c);
    sums.push(sum);
  }

  var nb_features = result_data[layer_to_add].length;
  var new_layer = map.insert('g', '.legend').attr('id', layer_id).attr('class', 'layer no_clip');

  if (symbol_type === 'circle') {
    var r = rendering_params.size;
    for (var _j = 0; _j < result_data[layer_to_add].length; _j++) {
      var centroid = path.centroid({
        type: 'Point',
        coordinates: result_data[layer_to_add][_j].centroid
      });
      var group = new_layer.append('g');
      var _sum = sums[_j];
      var _colors = colors[_j];
      for (var _i3 = 0; _i3 < _sum; _i3++) {
        var t_x = round(_i3 % nCol * 2 * r);
        var t_y = floor(floor(_i3 / nCol) * 2 * r);
        group.append('circle').attrs({
          transform: 'translate(-' + t_x + ', -' + t_y + ')',
          cx: centroid[0],
          cy: centroid[1],
          r: r,
          id: ['waffle_', _i3, ' feature_', result_data[layer_to_add][_j].id].join(''),
          fill: _colors[_i3]
        });
      }
      group.node().__data__ = { properties: result_data[layer_to_add][_j] };
      group.call(drag_waffle);
    }
  } else if (symbol_type === 'rect') {
    var width = rendering_params.size;
    var offset = width / 5;
    for (var _j2 = 0; _j2 < result_data[layer_to_add].length; _j2++) {
      var _centroid = path.centroid({
        type: 'Point',
        coordinates: result_data[layer_to_add][_j2].centroid
      });
      var _group = new_layer.append('g');
      var _sum2 = sums[_j2];
      var _colors2 = colors[_j2];
      for (var _i4 = 0; _i4 < _sum2; _i4++) {
        var _t_x = round(_i4 % nCol * width) + offset * round(_i4 % nCol);
        var _t_y = floor(floor(_i4 / nCol) * width) + offset * floor(_i4 / nCol);
        _group.append('rect').attrs({
          transform: 'translate(-' + _t_x + ', -' + _t_y + ')',
          x: _centroid[0],
          y: _centroid[1],
          width: width,
          height: width,
          id: ['waffle_', _i4, ' feature_', result_data[layer_to_add][_j2].id].join(''),
          fill: _colors2[_i4]
        });
      }
      _group.node().__data__ = { properties: result_data[layer_to_add][_j2] };
      _group.call(drag_waffle);
    }
  }

  current_layers[layer_to_add] = {
    fill_color: ref_colors,
    n_features: nb_features,
    renderer: 'TwoStocksWaffle',
    symbol: symbol_type,
    rendered_field: fields,
    size: rendering_params.size,
    ratio: ratio,
    nCol: nCol,
    'stroke-width-const': 0,
    is_result: true,
    ref_layer_name: layer,
    draggable: false
  };
  create_li_layer_elem(layer_to_add, nb_features, ['Point', 'waffle'], 'result');
}

function fillMenu_PropSymbolChoro(layer) {
  var dv2 = make_template_functionnality(section2);

  var a = dv2.append('p').attr('class', 'params_section2');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.field1' }).html(i18next.t('app_page.func_options.choroprop.field1'));
  a.insert('select').attrs({ class: 'params', id: 'PropSymbolChoro_field_1' });

  var b = dv2.append('p').attr('class', 'params_section2');
  b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.fixed_size' }).html(i18next.t('app_page.func_options.choroprop.fixed_size'));
  b.insert('input').attrs({
    id: 'PropSymbolChoro_ref_size',
    type: 'number',
    class: 'params',
    min: 0.1,
    max: 100.0,
    value: 60.0,
    step: 'any' }).style('width', '50px');
  b.append('span').html(' (px)');

  var c = dv2.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.on_value' }).html(i18next.t('app_page.func_options.choroprop.on_value'));
  c.insert('input').styles({ width: '100px', 'margin-left': '10px' }).attrs({ type: 'number', class: 'params', id: 'PropSymbolChoro_ref_value' }).attrs({ min: 0.1, step: 0.1 });

  // Other symbols could probably easily be proposed :
  var d = dv2.append('p').attr('class', 'params_section2');
  d.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.symbol_type' }).html(i18next.t('app_page.func_options.choroprop.symbol_type'));
  d.insert('select').attrs({ class: 'params i18n', id: 'PropSymbolChoro_symbol_type' });

  var e = dv2.append('p').attr('class', 'params_section2');
  e.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.choroprop.field2' }).html(i18next.t('app_page.func_options.choroprop.field2'));

  e.insert('select').attrs({ class: 'params', id: 'PropSymbolChoro_field_2' });

  var discr_section = dv2.insert('p').style('margin', 'auto');
  discr_section.insert('span').attr('id', 'container_sparkline_propsymbolchoro').styles({ margin: '16px 50px 0px 4px', float: 'right' });
  make_discretization_icons(discr_section);
  // let f = dv2.insert('p').attr('class', 'params_section2');
  // f.append("button")
  //     .attrs({id: 'PropSymbolChoro_btn_disc', class: 'params button_disc i18n',
  //             'data-i18n': '[html]app_page.func_options.common.discretization_choice'})
  //     .styles({"font-size": "0.8em", "text-align": "center"})
  //     .html(i18next.t("app_page.func_options.common.discretization_choice"));

  make_layer_name_button(dv2, 'PropSymbolChoro_output_name', '15px');
  make_ok_button(dv2, 'propChoro_yes');
  dv2.selectAll('.params').attr('disabled', true);
}

var fields_PropSymbolChoro = {
  fill: function fill(layer) {
    if (!layer) return;
    section2.selectAll('.params').attr('disabled', null);
    var self = this,
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

    var uncolor_icons = function uncolor_icons() {
      ico_jenks.style('border', null);
      ico_q6.style('border', null);
      ico_quantiles.style('border', null);
      ico_equal_interval.style('border', null);
    };

    if (current_layers[layer].type === 'Line') {
      ref_size.attr('value', 10.0);
      [['app_page.func_options.common.symbol_line', 'line'], ['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    } else {
      ref_size.attr('value', 60.0);
      [['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    }

    var prepare_disc_quantiles = function prepare_disc_quantiles(field) {
      var _values = user_data[layer].map(function (v) {
        return v[field];
      });
      var n_class = getOptNbClass(_values.length);
      render_mini_chart_serie(_values.map(function (v) {
        return +v;
      }), document.getElementById('container_sparkline_propsymbolchoro'));

      var _discretize_to_colors = discretize_to_colors(_values, 'quantiles', n_class),
          _discretize_to_colors2 = _slicedToArray(_discretize_to_colors, 6),
          nb_class = _discretize_to_colors2[0],
          type = _discretize_to_colors2[1],
          breaks = _discretize_to_colors2[2],
          color_array = _discretize_to_colors2[3],
          colors_map = _discretize_to_colors2[4],
          no_data_color = _discretize_to_colors2[5];

      self.rendering_params[field] = {
        nb_class: nb_class,
        type: 'quantiles',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
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
      var first_field = fields_ratio[0];
      prepare_disc_quantiles(first_field);
      ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
    }

    fields_stock.forEach(function (field) {
      field_size.append('option').text(field).attr('value', field);
    });
    fields_ratio.forEach(function (field) {
      field_color.append('option').text(field).attr('value', field);
    });
    field_size.on('change', function () {
      var field_name = this.value,
          max_val_field = max_fast(user_data[layer].map(function (obj) {
        return +obj[field_name];
      }));

      ref_value_field.attrs({ max: max_val_field, value: max_val_field });
      uo_layer_name.attr('value', ['PropSymbols', field_name, field_color.node().value, layer].join('_'));
    });

    field_color.on('change', function () {
      var field_name = this.value;
      var vals = user_data[layer].map(function (a) {
        return +a[field_name];
      });
      render_mini_chart_serie(vals, document.getElementById('container_sparkline_propsymbolchoro'));
      uo_layer_name.attr('value', ['PropSymbols', field_size.node().value, field_name, layer].join('_'));
      if (self.rendering_params[field_name] !== undefined) {
        // ok_button.attr('disabled', null);
        img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        choro_mini_choice_disc.html([i18next.t('app_page.common.' + self.rendering_params[field_name].type), ', ', i18next.t('app_page.common.class', { count: self.rendering_params[field_name].nb_class })].join(''));
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
      var selected_field = field_color.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors3 = discretize_to_colors(_values, 'jenks', n_class, 'BuGn'),
          _discretize_to_colors4 = _slicedToArray(_discretize_to_colors3, 6),
          nb_class = _discretize_to_colors4[0],
          type = _discretize_to_colors4[1],
          breaks = _discretize_to_colors4[2],
          color_array = _discretize_to_colors4[3],
          colors_map = _discretize_to_colors4[4],
          no_data_color = _discretize_to_colors4[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'jenks',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'PropSymbolsChoro',
        rendered_field: selected_field,
        schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.jenks') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_quantiles.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_color.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors5 = discretize_to_colors(_values, 'quantiles', n_class, 'BuGn'),
          _discretize_to_colors6 = _slicedToArray(_discretize_to_colors5, 6),
          nb_class = _discretize_to_colors6[0],
          type = _discretize_to_colors6[1],
          breaks = _discretize_to_colors6[2],
          color_array = _discretize_to_colors6[3],
          colors_map = _discretize_to_colors6[4],
          no_data_color = _discretize_to_colors6[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'quantiles',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'PropSymbolsChoro',
        rendered_field: selected_field,
        schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_equal_interval.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_color.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors7 = discretize_to_colors(_values, 'equal_interval', n_class, 'BuGn'),
          _discretize_to_colors8 = _slicedToArray(_discretize_to_colors7, 6),
          nb_class = _discretize_to_colors8[0],
          type = _discretize_to_colors8[1],
          breaks = _discretize_to_colors8[2],
          color_array = _discretize_to_colors8[3],
          colors_map = _discretize_to_colors8[4],
          no_data_color = _discretize_to_colors8[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'equal_interval',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'PropSymbolsChoro',
        rendered_field: selected_field,
        schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.equal_interval') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_q6.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_color.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      });

      var _discretize_to_colors9 = discretize_to_colors(_values, 'Q6', 6, 'BuGn'),
          _discretize_to_colors10 = _slicedToArray(_discretize_to_colors9, 6),
          nb_class = _discretize_to_colors10[0],
          type = _discretize_to_colors10[1],
          breaks = _discretize_to_colors10[2],
          color_array = _discretize_to_colors10[3],
          colors_map = _discretize_to_colors10[4],
          no_data_color = _discretize_to_colors10[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'Q6',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'PropSymbolsChoro',
        rendered_field: selected_field,
        schema: ['BuGn']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.Q6') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_disc.on('click', function () {
      var selected_field = field_color.node().value;
      var opt_nb_class = Math.floor(1 + 3.3 * Math.log10(user_data[layer].length));
      var conf_disc_box = void 0;

      if (self.rendering_params[selected_field]) {
        conf_disc_box = display_discretization(layer, selected_field, self.rendering_params[selected_field].nb_class, { schema: self.rendering_params[selected_field].schema,
          colors: self.rendering_params[selected_field].colors,
          no_data: self.rendering_params[selected_field].no_data,
          type: self.rendering_params[selected_field].type,
          breaks: self.rendering_params[selected_field].breaks,
          extra_options: self.rendering_params[selected_field].extra_options });
      } else {
        conf_disc_box = display_discretization(layer, selected_field, opt_nb_class, { type: 'quantiles' });
      }

      conf_disc_box.then(function (confirmed) {
        if (confirmed) {
          img_valid_disc.attr('src', '/static/img/Light_green_check.png');
          choro_mini_choice_disc.html([i18next.t('app_page.common.' + confirmed[1]), ', ', i18next.t('app_page.common.class', { count: confirmed[0] })].join(''));
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
        }
      });
    });
    ok_button.on('click', function () {
      if (!ref_value_field.node().value) return;
      var rendering_params = self.rendering_params;
      if (rendering_params[field_color.node().value]) {
        // const layer = Object.getOwnPropertyNames(user_data)[0];
        var symbol_to_use = symb_selec.node().value,

        // nb_features = user_data[layer].length,
        rd_params = {},
            color_field = field_color.node().value;
        var new_layer_name = uo_layer_name.node().value;

        new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : layer + '_PropSymbolsChoro');

        rd_params.field = field_size.node().value;
        rd_params.new_name = new_layer_name;
        rd_params.nb_features = nb_features;
        rd_params.ref_layer_name = layer;
        rd_params.symbol = symbol_to_use;
        rd_params.ref_value = +ref_value_field.node().value;
        rd_params.ref_size = +ref_size.node().value;
        rd_params.fill_color = rendering_params[color_field].colorsByFeature;
        rd_params.color_field = color_field;

        if (symbol_to_use === 'line') {
          make_prop_line(rd_params);
        } else {
          make_prop_symbols(rd_params);
        }
        var colors_breaks = [];
        for (var i = rendering_params[color_field].breaks.length - 1; i > 0; --i) {
          colors_breaks.push([[rendering_params[color_field].breaks[i - 1], ' - ', rendering_params[color_field].breaks[i]].join(''), rendering_params[color_field].colors[i - 1]]);
        }

        var options_disc = {
          schema: rendering_params[color_field].schema,
          colors: rendering_params[color_field].colors,
          no_data: rendering_params[color_field].no_data,
          type: rendering_params[color_field].type,
          breaks: rendering_params[color_field].breaks,
          extra_options: rendering_params[color_field].extra_options
        };

        Object.assign(current_layers[new_layer_name], {
          renderer: 'PropSymbolsChoro',
          options_disc: options_disc,
          rendered_field: field_size.node().value,
          rendered_field2: field_color.node().value,
          colors_breaks: colors_breaks
        });
        zoom_without_redraw();
        switch_accordion_section();
        handle_legend(new_layer_name);
      }
    });
    setSelected(field_size.node(), fields_stock[0]);
    setSelected(field_color.node(), fields_ratio[0]);
  },


  unfill: function unfill() {
    unfillSelectInput(document.getElementById('PropSymbolChoro_field_1'));
    unfillSelectInput(document.getElementById('PropSymbolChoro_field_2'));
    unfillSelectInput(document.getElementById('PropSymbolChoro_symbol_type'));
    section2.selectAll('.params').attr('disabled', true);
  },

  rendering_params: {}
};

var fillMenu_Typo = function fillMenu_Typo() {
  var dv2 = make_template_functionnality(section2);

  var a = dv2.append('p').attr('class', 'params_section2');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.typo.field' }).html(i18next.t('app_page.func_options.typo.field'));
  a.insert('select').attrs({ id: 'Typo_field_1', class: 'params' });

  var b = dv2.insert('p').styles({ margin: 'auto', 'text-align': 'center' });
  b.append('button').attrs({ id: 'Typo_class',
    class: 'button_disc params i18n',
    'data-i18n': '[html]app_page.func_options.typo.color_choice' }).styles({ 'font-size': '0.8em', 'text-align': 'center' }).html(i18next.t('app_page.func_options.typo.color_choice'));

  make_layer_name_button(dv2, 'Typo_output_name');
  make_ok_button(dv2, 'Typo_yes');
  dv2.selectAll('.params').attr('disabled', true);
};

var fields_Typo = {
  fill: function fill(layer) {
    if (!layer) return;
    var self = this,
        g_lyr_name = '#' + layer,
        fields_name = getFieldsType('category', layer),
        field_selec = section2.select('#Typo_field_1'),
        ok_button = section2.select('#Typo_yes'),
        btn_typo_class = section2.select('#Typo_class'),
        uo_layer_name = section2.select('#Typo_output_name');

    var prepare_colors = function prepare_colors(field) {
      var _prepare_categories_a = prepare_categories_array(layer, field, null),
          _prepare_categories_a2 = _slicedToArray(_prepare_categories_a, 2),
          cats = _prepare_categories_a2[0],
          col_map = _prepare_categories_a2[1];

      var nb_class = col_map.size;
      var colorByFeature = user_data[layer].map(function (ft) {
        return col_map.get(ft[field])[0];
      });
      self.rendering_params[field] = {
        nb_class: nb_class,
        color_map: col_map,
        colorByFeature: colorByFeature,
        renderer: 'Categorical',
        rendered_field: field,
        skip_alert: false
      };
    };

    fields_name.forEach(function (f_name) {
      field_selec.append('option').text(f_name).attr('value', f_name);
    });

    field_selec.on('change', function () {
      var selected_field = this.value;
      uo_layer_name.attr('value', ['Typo', selected_field, layer].join('_'));
      prepare_colors(selected_field);
    });

    // Set some default colors in order to not force to open the box for selecting them :
    {
      var first_field = fields_name[0];
      prepare_colors(first_field);
      ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
    }

    btn_typo_class.on('click', function () {
      var selected_field = field_selec.node().value,
          nb_features = current_layers[layer].n_features;
      var col_map = self.rendering_params[selected_field] ? self.rendering_params[selected_field].color_map : undefined;

      var _prepare_categories_a3 = prepare_categories_array(layer, selected_field, col_map),
          _prepare_categories_a4 = _slicedToArray(_prepare_categories_a3, 2),
          cats = _prepare_categories_a4[0],
          c_map = _prepare_categories_a4[1];

      if (cats.length > 15) {
        swal({ title: '',
          text: i18next.t('app_page.common.error_too_many_features_color'),
          type: 'warning',
          showCancelButton: true,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.valid') + '!',
          cancelButtonText: i18next.t('app_page.common.cancel')
        }).then(function () {
          display_categorical_box(user_data[layer], layer, selected_field, cats).then(function (confirmed) {
            if (confirmed) {
              self.rendering_params[selected_field] = {
                nb_class: confirmed[0],
                color_map: confirmed[1],
                colorByFeature: confirmed[2],
                renderer: 'Categorical',
                rendered_field: selected_field,
                skip_alert: true
              };
            }
          });
        }, function (dismiss) {
          return null;
        });
      } else {
        display_categorical_box(user_data[layer], layer, selected_field, cats).then(function (confirmed) {
          if (confirmed) {
            self.rendering_params[selected_field] = {
              nb_class: confirmed[0],
              color_map: confirmed[1],
              colorByFeature: confirmed[2],
              renderer: 'Categorical',
              rendered_field: selected_field,
              skip_alert: true
            };
          }
        });
      }
    });

    ok_button.on('click', function () {
      var selected_field = field_selec.node().value;
      var params = self.rendering_params[selected_field];
      var render = function render() {
        if (params) {
          var _layer = Object.getOwnPropertyNames(user_data)[0];
          var output_name = uo_layer_name.node().value;
          params.new_name = check_layer_name(output_name.length > 0 ? output_name : ['Typo', selected_field, _layer].join('_'));
          render_categorical(_layer, params);
          switch_accordion_section();
          handle_legend(params.new_name);
        }
      };
      if (params.color_map.size > 15 && !params.skip_alert) {
        swal({ title: '',
          text: i18next.t('app_page.common.error_too_many_features_color'),
          type: 'warning',
          showCancelButton: true,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.valid') + '!',
          cancelButtonText: i18next.t('app_page.common.cancel')
        }).then(function () {
          render();
        }, function (dismiss) {
          return null;
        });
      } else {
        render();
      }
    });
    uo_layer_name.attr('value', 'Typo_' + layer);
    section2.selectAll('.params').attr('disabled', null);
    setSelected(field_selec.node(), fields_name[0]);
  },
  unfill: function unfill() {
    unfillSelectInput(document.getElementById('Typo_field_1'));
    section2.selectAll('.params').attr('disabled', true);
  },
  rendering_params: {}
};

function fillMenu_Choropleth() {
  var dv2 = make_template_functionnality(section2);

  var field_selec_section = dv2.append('p').attr('class', 'params_section2');
  field_selec_section.insert('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' }).html(i18next.t('app_page.func_options.common.field'));

  field_selec_section.insert('select').attrs({ id: 'choro_field1', class: 'params' });

  var discr_section = dv2.insert('p').style('margin', 'auto');
  discr_section.insert('span').attr('id', 'container_sparkline_choro').styles({ margin: '16px 50px 0px 4px', float: 'right' });
  make_discretization_icons(discr_section);

  make_layer_name_button(dv2, 'Choro_output_name', '15px');
  make_ok_button(dv2, 'choro_yes');
  dv2.selectAll('.params').attr('disabled', true);
}

var fields_Choropleth = {
  fill: function fill(layer) {
    if (!layer) return;
    var self = this,
        g_lyr_name = '#' + layer,
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

    var uncolor_icons = function uncolor_icons() {
      ico_jenks.style('border', null);
      ico_q6.style('border', null);
      ico_quantiles.style('border', null);
      ico_equal_interval.style('border', null);
    };

    var prepare_disc_quantiles = function prepare_disc_quantiles(field) {
      var _values = user_data[layer].map(function (v) {
        return v[field];
      }),
          n_class = getOptNbClass(_values.length);
      render_mini_chart_serie(_values.map(function (v) {
        return +v;
      }), document.getElementById('container_sparkline_choro'));

      var _discretize_to_colors11 = discretize_to_colors(_values, 'quantiles', n_class),
          _discretize_to_colors12 = _slicedToArray(_discretize_to_colors11, 6),
          nb_class = _discretize_to_colors12[0],
          type = _discretize_to_colors12[1],
          breaks = _discretize_to_colors12[2],
          color_array = _discretize_to_colors12[3],
          colors_map = _discretize_to_colors12[4],
          no_data_color = _discretize_to_colors12[5];

      self.rendering_params[field] = {
        nb_class: nb_class,
        type: 'quantiles',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
      uncolor_icons();
      ico_quantiles.style('border', 'solid 1px green');
    };

    if (fields.length === 0) {
      display_error_num_field();
      return;
    }
    section2.selectAll('.params').attr('disabled', null);
    fields.forEach(function (field) {
      field_selec.append('option').text(field).attr('value', field);
    });

    // Set some default colors in order to not force to open the box for selecting them :
    {
      var first_field = fields[0];
      prepare_disc_quantiles(first_field);
      ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
    }

    field_selec.on('change', function () {
      var field_name = this.value,
          vals = user_data[layer].map(function (a) {
        return +a[field_name];
      });
      render_mini_chart_serie(vals, document.getElementById('container_sparkline_choro'));
      uo_layer_name.attr('value', ['Choro', field_name, layer].join('_'));
      if (self.rendering_params[field_name] !== undefined) {
        // ok_button.attr('disabled', null);
        img_valid_disc.attr('src', '/static/img/Light_green_check.png');
        var keyi18n = 'app_page.common.' + self.rendering_params[field_name].type;
        choro_mini_choice_disc.html(i18next.t(keyi18n) + ', ' + i18next.t('app_page.common.class', { count: self.rendering_params[field_name].nb_class }));
        uncolor_icons();
        color_disc_icons(self.rendering_params[field_name].type);
      } else {
        prepare_disc_quantiles(field_name);
      }
    });

    ico_jenks.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_selec.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors13 = discretize_to_colors(_values, 'jenks', n_class),
          _discretize_to_colors14 = _slicedToArray(_discretize_to_colors13, 6),
          nb_class = _discretize_to_colors14[0],
          type = _discretize_to_colors14[1],
          breaks = _discretize_to_colors14[2],
          color_array = _discretize_to_colors14[3],
          colors_map = _discretize_to_colors14[4],
          no_data_color = _discretize_to_colors14[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'jenks',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: selected_field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.jenks') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      // ok_button.attr('disabled', null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_quantiles.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_selec.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors15 = discretize_to_colors(_values, 'quantiles', n_class),
          _discretize_to_colors16 = _slicedToArray(_discretize_to_colors15, 6),
          nb_class = _discretize_to_colors16[0],
          type = _discretize_to_colors16[1],
          breaks = _discretize_to_colors16[2],
          color_array = _discretize_to_colors16[3],
          colors_map = _discretize_to_colors16[4],
          no_data_color = _discretize_to_colors16[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'quantiles',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: selected_field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.quantiles') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      // ok_button.attr("disabled", null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_equal_interval.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_selec.node().value,
          _values = user_data[layer].map(function (v) {
        return v[selected_field];
      }),
          n_class = getOptNbClass(_values.length);

      var _discretize_to_colors17 = discretize_to_colors(_values, 'equal_interval', n_class),
          _discretize_to_colors18 = _slicedToArray(_discretize_to_colors17, 6),
          nb_class = _discretize_to_colors18[0],
          type = _discretize_to_colors18[1],
          breaks = _discretize_to_colors18[2],
          color_array = _discretize_to_colors18[3],
          colors_map = _discretize_to_colors18[4],
          no_data_color = _discretize_to_colors18[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'equal_interval',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: selected_field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.equal_interval') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      // ok_button.attr("disabled", null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    ico_q6.on('click', function () {
      uncolor_icons();
      this.style.border = 'solid 1px green';
      var selected_field = field_selec.node().value;
      var _values = user_data[layer].map(function (v) {
        return v[selected_field];
      });

      var _discretize_to_colors19 = discretize_to_colors(_values, 'Q6', 6),
          _discretize_to_colors20 = _slicedToArray(_discretize_to_colors19, 6),
          nb_class = _discretize_to_colors20[0],
          type = _discretize_to_colors20[1],
          breaks = _discretize_to_colors20[2],
          color_array = _discretize_to_colors20[3],
          colors_map = _discretize_to_colors20[4],
          no_data_color = _discretize_to_colors20[5];

      self.rendering_params[selected_field] = {
        nb_class: nb_class,
        type: 'Q6',
        colors: color_array,
        breaks: breaks,
        no_data: no_data_color,
        colorsByFeature: colors_map,
        renderer: 'Choropleth',
        rendered_field: selected_field,
        schema: ['Reds']
      };
      choro_mini_choice_disc.html(i18next.t('app_page.common.Q6') + ', ' + i18next.t('app_page.common.class', { count: nb_class }));
      // ok_button.attr("disabled", null);
      img_valid_disc.attr('src', '/static/img/Light_green_check.png');
    });

    btn_class.on('click', function () {
      var selected_field = field_selec.node().value,
          opt_nb_class = getOptNbClass(user_data[layer].length);
      var conf_disc_box = void 0;

      if (self.rendering_params[selected_field]) {
        conf_disc_box = display_discretization(layer, selected_field, self.rendering_params[selected_field].nb_class, { schema: self.rendering_params[selected_field].schema,
          colors: self.rendering_params[selected_field].colors,
          type: self.rendering_params[selected_field].type,
          no_data: self.rendering_params[selected_field].no_data,
          breaks: self.rendering_params[selected_field].breaks,
          extra_options: self.rendering_params[selected_field].extra_options });
      } else {
        conf_disc_box = display_discretization(layer, selected_field, opt_nb_class, { type: 'quantiles' });
      }
      conf_disc_box.then(function (confirmed) {
        if (confirmed) {
          // ok_button.attr("disabled", null);
          img_valid_disc.attr('src', '/static/img/Light_green_check.png');
          var keyi18n = 'app_page.common.' + confirmed[1];
          choro_mini_choice_disc.html(i18next.t(keyi18n) + ', ' + i18next.t('app_page.common.class', { count: confirmed[0] }));
          uncolor_icons();
          color_disc_icons(confirmed[1]);
          self.rendering_params[selected_field] = {
            nb_class: confirmed[0],
            type: confirmed[1],
            breaks: confirmed[2],
            colors: confirmed[3],
            schema: confirmed[5],
            no_data: confirmed[6],
            colorsByFeature: confirmed[4],
            renderer: 'Choropleth',
            rendered_field: selected_field,
            new_name: '',
            extra_options: confirmed[7]
          };
        }
      });
    });

    ok_button.on('click', function () {
      var field_to_render = field_selec.node().value;
      if (self.rendering_params[field_to_render]) {
        var user_new_layer_name = uo_layer_name.node().value;
        self.rendering_params[field_to_render].new_name = check_layer_name(user_new_layer_name.length > 0 ? user_new_layer_name : ['Choro', field_to_render, layer].join('_'));
        render_choro(layer, self.rendering_params[field_to_render]);
        handle_legend(self.rendering_params[field_to_render].new_name);
        switch_accordion_section();
      }
    });
    setSelected(field_selec.node(), fields[0]);
  },

  unfill: function unfill() {
    // const field_selec = document.getElementById('choro_field1'),
    //   nb_fields = field_selec.childElementCount;
    //
    // for (let i = nb_fields - 1; i > -1; --i) {
    //     // delete this.rendering_params[field_selec.children[i]];
    //   field_selec.removeChild(field_selec.children[i]);
    // }
    unfillSelectInput(document.getElementById('choro_field1'));
    d3.selectAll('.params').attr('disabled', true);
  },
  rendering_params: {}
};

var fields_Stewart = {
  fill: function fill(layer) {
    var other_layers = get_other_layer_names(),
        mask_selec = d3.select('#stewart_mask');
    var default_selected_mask = void 0;

    unfillSelectInput(mask_selec.node());
    mask_selec.append('option').text('None').attr('value', 'None');
    for (var i = 0, n_layer = other_layers.length, lyr_name; i < n_layer; i++) {
      lyr_name = other_layers[i];
      if (current_layers[lyr_name].type === 'Polygon') {
        mask_selec.append('option').text(lyr_name).attr('value', lyr_name);
        if (current_layers[lyr_name].targeted) {
          default_selected_mask = lyr_name;
        }
      }
    }
    if (default_selected_mask) {
      setSelected(mask_selec.node(), default_selected_mask);
    }
    if (layer) {
      var fields = getFieldsType('stock', layer),
          field_selec = section2.select('#stewart_field'),
          field_selec2 = section2.select('#stewart_field2');

      if (fields.length === 0) {
        display_error_num_field();
        return;
      }

      field_selec2.append('option').text(' ').attr('value', 'None');
      fields.forEach(function (field) {
        field_selec.append('option').text(field).attr('value', field);
        field_selec2.append('option').text(field).attr('value', field);
      });
      document.getElementById('stewart_span').value = get_first_guess_span('stewart');

      field_selec.on('change', function () {
        document.getElementById('stewart_output_name').value = ['Smoothed', this.value, layer].join('_');
      });
      document.getElementById('stewart_output_name').value = ['Smoothed', fields[0], layer].join('_');
      section2.select('#stewart_yes').on('click', render_stewart);
    }
    section2.selectAll('.params').attr('disabled', null);
  },

  unfill: function unfill() {
    unfillSelectInput(document.getElementById('stewart_field'));
    unfillSelectInput(document.getElementById('stewart_field2'));
    unfillSelectInput(document.getElementById('stewart_mask'));
    d3.selectAll('.params').attr('disabled', true);
  }
};

function render_stewart() {
  var formToSend = new FormData(),
      doc = document,
      field1_n = doc.getElementById('stewart_field').value,
      field2_n = doc.getElementById('stewart_field2').value,
      var1_to_send = {},
      var2_to_send = {},
      layer = Object.getOwnPropertyNames(user_data)[0],
      span = +doc.getElementById('stewart_span').value,
      beta = +doc.getElementById('stewart_beta').value,
      func_selec = doc.getElementById('stewart_func').value,
      mask_name = doc.getElementById('stewart_mask').value,
      new_user_layer_name = document.getElementById('stewart_output_name').value;

  var nb_class = doc.getElementById('stewart_nb_class').value,
      bval = doc.getElementById('stewart_breaks').value.trim(),
      reso = +doc.getElementById('stewart_resolution').value;

  if (nb_class !== (nb_class | 0)) {
    // eslint-disable-line
    nb_class = nb_class | 0; // eslint-disable-line
    doc.getElementById('stewart_nb_class').value = nb_class;
  }

  if (reso && reso > 0) {
    var res_test = test_maxmin_resolution(reso);
    if (res_test) {
      var message = res_test === 'low' ? i18next.t('app_page.common.error_too_low_resolution') : i18next.t('app_page.common.error_too_high_resolution');
      display_error_during_computation(message);
      return;
    }
    reso *= 1000;
  } else {
    reso = null;
  }
  bval = bval.length > 0 ? bval.split('-').map(function (val) {
    return +val.trim();
  }) : null;

  var1_to_send[field1_n] = current_layers[layer].original_fields.has(field1_n) ? [] : user_data[layer].map(function (i) {
    return +i[field1_n];
  });
  if (field2_n !== 'None') {
    var2_to_send[field2_n] = current_layers[layer].original_fields.has(field2_n) ? [] : user_data[layer].map(function (i) {
      return +i[field2_n];
    });
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

  xhrequest('POST', 'compute/stewart', formToSend, true).then(function (res) {
    var data_split = res.split('|||'),
        raw_topojson = data_split[0],
        options = { result_layer_on_add: true, func_name: 'smooth' };
    if (new_user_layer_name.length > 0) {
      options.choosed_name = new_user_layer_name;
    }
    var n_layer_name = add_layer_topojson(raw_topojson, options);
    if (!n_layer_name) return;
    var class_lim = JSON.parse(data_split[1]),
        col_pal = getColorBrewerArray(class_lim.min.length, 'Oranges'),
        n_class = class_lim.min.length,
        colors_breaks = [];
    for (var i = 0; i < n_class; i++) {
      colors_breaks.push([class_lim.min[i] + ' - ' + class_lim.max[i], col_pal[n_class - 1 - i]]);
    }

    current_layers[n_layer_name].fill_color = { class: [] };
    current_layers[n_layer_name].renderer = 'Stewart';
    current_layers[n_layer_name].colors_breaks = colors_breaks;
    current_layers[n_layer_name].rendered_field = field1_n;
    current_layers[n_layer_name].color_palette = { name: 'Oranges', reversed: true };
    current_layers[n_layer_name].options_disc = {
      breaks: [].concat(class_lim.max[0], class_lim.min).reverse()
    };
    map.select('#' + _app.layer_to_id.get(n_layer_name)).selectAll('path').styles(function (d, i) {
      return { fill: col_pal[n_class - 1 - i], 'fill-opacity': 1, 'stroke-opacity': 0 };
    });
    handle_legend(n_layer_name);
    switch_accordion_section();
    // Todo : use the function render_choro to render the result from stewart too
  }, function (error) {
    display_error_during_computation();
    console.log(error);
  }).catch(function (err) {
    display_error_during_computation();
    console.log(err);
  });
}

function fillMenu_Stewart() {
  var dialog_content = make_template_functionnality(section2);

  var a = dialog_content.append('p').attr('class', 'params_section2');
  a.append('span').style('margin', '10px 0px 0px').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.field' }).html(i18next.t('app_page.func_options.smooth.field'));
  a.append('span').insert('select').attrs({ class: 'params marg_auto', id: 'stewart_field' });

  var b = dialog_content.append('p').attr('class', 'params_section2');
  b.append('span').style('margin', '10px 0px 0px').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.divide_field' }).html(i18next.t('app_page.func_options.smooth.divide_field'));
  b.insert('select').attrs({ class: 'params marg_auto', id: 'stewart_field2' });

  var p_span = dialog_content.append('p').attr('class', 'params_section2');
  p_span.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.span' }).text(i18next.t('app_page.func_options.smooth.span'));
  p_span.append('input').style('width', '60px').attrs({ type: 'number', class: 'params', id: 'stewart_span', value: 5, min: 0, max: 100000, step: 'any' });
  p_span.append('span').html(' (km)');

  var d = dialog_content.append('p').attr('class', 'params_section2');
  d.append('span').styles({ 'margin-right': '35px' }).attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.beta' }).html(i18next.t('app_page.func_options.smooth.beta'));
  d.insert('input').style('width', '60px').attrs({ type: 'number', class: 'params', id: 'stewart_beta', value: 2, min: 0, max: 11, step: 'any' });

  var p_reso = dialog_content.append('p').attr('class', 'params_section2');
  p_reso.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.resolution' }).text(i18next.t('app_page.func_options.smooth.resolution'));
  p_reso.insert('input').style('width', '60px').attrs({ type: 'number', class: 'params', id: 'stewart_resolution', min: 1, max: 1000000, step: 'any' });
  p_reso.insert('label').html(' (km)');

  var f = dialog_content.append('p').attr('class', 'params_section2');
  f.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.func_options' }).html(i18next.t('app_page.func_options.smooth.function'));
  var func_selec = f.insert('select').attrs({ class: 'params i18n', id: 'stewart_func' });

  var g = dialog_content.append('p').attr('class', 'params_section2');
  g.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.nb_class' }).html(i18next.t('app_page.func_options.smooth.nb_class'));
  g.insert('input').style('width', '50px').attrs({ type: 'number', class: 'params', id: 'stewart_nb_class', value: 8, min: 1, max: 22, step: 1 });

  var bvs = dialog_content.append('p').attr('class', 'params_section2');
  bvs.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.break_values' }).html(i18next.t('app_page.func_options.smooth.break_values'));
  bvs.insert('textarea').styles({ width: '100%', height: '2.2em', 'font-size': '0.9em' }).attrs({ class: 'params i18n',
    id: 'stewart_breaks',
    'data-i18n': '[placeholder]app_page.common.expected_class',
    placeholder: i18next.t('app_page.common.expected_class') });
  var m = dialog_content.append('p').attr('class', 'params_section2').style('margin', 'auto');
  m.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.smooth.mask' }).html(i18next.t('app_page.func_options.smooth.mask'));

  dialog_content.insert('select').attrs({ class: 'params', id: 'stewart_mask' }).styles({ position: 'relative', float: 'right', margin: '1px 0px 10px 0px' });

  [['exponential', 'app_page.func_options.smooth.func_exponential'], ['pareto', 'app_page.func_options.smooth.func_pareto']].forEach(function (fun_name) {
    func_selec.append('option').text(i18next.t(fun_name[1])).attrs({ value: fun_name[0], 'data-i18n': '[text]' + fun_name[1] });
  });

  make_layer_name_button(dialog_content, 'stewart_output_name');
  make_ok_button(dialog_content, 'stewart_yes', false);
  dialog_content.selectAll('.params').attr('disabled', true);
}

var fields_Anamorphose = {
  fill: function fill(layer) {
    if (!layer) return;
    var fields = getFieldsType('stock', layer),
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
    });
    section2.selectAll('.params').attr('disabled', null);
    fields.forEach(function (field) {
      field_selec.append('option').text(field).attr('value', field);
    });

    field_selec.on('change', function () {
      var field_name = this.value,
          ref_value_field = document.getElementById('Anamorph_opt3');

      document.getElementById('Anamorph_output_name').value = ['Cartogram', this.value, layer].join('_');

      if (ref_value_field) {
        var max_val_field = max_fast(user_data[layer].map(function (obj) {
          return +obj[field_name];
        }));
        ref_value_field.setAttribute('max', max_val_field);
        ref_value_field.value = max_val_field;
      }
    });

    ok_button.on('click', function () {
      var algo = algo_selec.node().value,
          nb_features = user_data[layer].length,
          field_name = field_selec.node().value,
          new_user_layer_name = document.getElementById('Anamorph_output_name').value;

      if (algo === 'olson') {
        var nb_ft = current_layers[layer].n_features;
        var dataset = user_data[layer];

        // if (contains_empty_val(dataset.map(a => a[field_name]))) {
        //   discard_rendering_empty_val();
        //   return;
        // }

        var layer_select = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path'),
            sqrt = Math.sqrt,
            abs = Math.abs,
            d_val = [],
            transform = [];

        for (var i = 0; i < nb_ft; ++i) {
          var val = +dataset[i][field_name];
          // We deliberatly use 0 if this is a missing value :
          if (isNaN(val) || !isFinite(val)) val = 0;
          d_val.push([i, val, +path.area(layer_select[i].__data__.geometry)]);
        }
        d_val.sort(function (a, b) {
          return b[1] - a[1];
        });
        var ref = d_val[0][1] / d_val[0][2];
        d_val[0].push(1);

        for (var _i5 = 0; _i5 < nb_ft; ++_i5) {
          var _val = d_val[_i5][1] / d_val[_i5][2];
          var scale = sqrt(_val / ref);
          d_val[_i5].push(scale);
        }
        d_val.sort(function (a, b) {
          return a[0] - b[0];
        });
        var formToSend = new FormData();
        formToSend.append('json', JSON.stringify({
          topojson: current_layers[layer].key_name,
          scale_values: d_val.map(function (ft) {
            return ft[3];
          }),
          field_name: field_name
        }));
        xhrequest('POST', 'compute/olson', formToSend, true).then(function (result) {
          var options = { result_layer_on_add: true, func_name: 'cartogram' };
          if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
            options.choosed_name = new_user_layer_name;
          }
          var n_layer_name = add_layer_topojson(result, options);
          current_layers[n_layer_name].renderer = 'OlsonCarto';
          current_layers[n_layer_name].rendered_field = field_name;
          current_layers[n_layer_name].scale_max = 1;
          current_layers[n_layer_name].ref_layer_name = layer;
          current_layers[n_layer_name].scale_byFeature = transform;
          map.select('#' + _app.layer_to_id.get(n_layer_name)).selectAll('path').style('fill-opacity', 0.8).style('stroke', 'black').style('stroke-opacity', 0.8);
          switch_accordion_section();
        }, function (err) {
          display_error_during_computation();
          console.log(err);
        });
      } else if (algo === 'dougenik') {
        var _formToSend = new FormData(),
            var_to_send = {},
            nb_iter = document.getElementById('Anamorph_dougenik_iterations').value;

        var_to_send[field_name] = [];
        if (!current_layers[layer].original_fields.has(field_name)) {
          var table = user_data[layer],
              to_send = var_to_send[field_name];
          for (var _i6 = 0, i_len = table.length; _i6 < i_len; ++_i6) {
            to_send.push(+table[_i6][field_name]);
          }
        }
        _formToSend.append('json', JSON.stringify({
          topojson: current_layers[layer].key_name,
          var_name: var_to_send,
          iterations: nb_iter
        }));

        xhrequest('POST', 'compute/carto_doug', _formToSend, true).then(function (data) {
          var options = { result_layer_on_add: true, func_name: 'cartogram' };
          if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
            options.choosed_name = new_user_layer_name;
          }
          var n_layer_name = add_layer_topojson(data, options);
          current_layers[n_layer_name].fill_color = { random: true };
          current_layers[n_layer_name].is_result = true;
          current_layers[n_layer_name]['stroke-width-const'] = 0.8;
          current_layers[n_layer_name].renderer = 'Carto_doug';
          current_layers[n_layer_name].rendered_field = field_name;
          map.select('#' + _app.layer_to_id.get(n_layer_name)).selectAll('path').style('fill', function (_) {
            return randomColor();
          }).style('fill-opacity', 0.8).style('stroke', 'black').style('stroke-opacity', 0.8);
          switch_accordion_section();
        }, function (error) {
          display_error_during_computation();
          console.log(error);
        });
      }
    });
    setSelected(field_selec.node(), field_selec.node().options[0].value);
  },

  unfill: function unfill() {
    var field_selec = document.getElementById('Anamorph_field');
    section2.selectAll('.params').attr('disabled', true);
    unfillSelectInput(field_selec);
  }
};

function fillMenu_Anamorphose() {
  var dialog_content = make_template_functionnality(section2);

  var algo_choice = dialog_content.append('p').attr('class', 'params_section2');
  algo_choice.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.algo' }).html(i18next.t('app_page.func_options.cartogram.algo'));
  var algo_selec = algo_choice.insert('select').attrs({ id: 'Anamorph_algo', class: 'params i18n' });

  var field_choice = dialog_content.append('p').attr('class', 'params_section2');
  field_choice.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.field' }).html(i18next.t('app_page.func_options.cartogram.field'));
  field_choice.insert('select').attrs({ class: 'params', id: 'Anamorph_field' });

  // Options for Dougenik mode :
  var doug1 = dialog_content.append('p').attr('class', 'params_section2 opt_dougenik');
  doug1.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.cartogram.dougenik_iterations' }).html(i18next.t('app_page.func_options.cartogram.dougenik_iterations'));
  doug1.insert('input').attrs({ type: 'number', class: 'params', value: 5, min: 1, max: 12, step: 1, id: 'Anamorph_dougenik_iterations' });

  // let o2 = dialog_content.append('p').attr('class', 'params_section2 opt_olson');

  [['Dougenik & al. (1985)', 'dougenik'], ['Olson (2005)', 'olson']].forEach(function (fun_name) {
    algo_selec.append('option').text(fun_name[0]).attr('value', fun_name[1]);
  });

  make_layer_name_button(dialog_content, 'Anamorph_output_name');
  make_ok_button(dialog_content, 'Anamorph_yes', false);

  dialog_content.selectAll('.params').attr('disabled', true);
  dialog_content.selectAll('.opt_olson').style('display', 'none');
}

function getCentroids(ref_layer_selection) {
  var centroids = [];
  for (var i = 0, nb_features = ref_layer_selection.length; i < nb_features; ++i) {
    var geom = ref_layer_selection[i].__data__.geometry;
    if (!geom) {
      centroids.push(null);
    } else if (geom.type.indexOf('Multi') < 0) {
      centroids.push(d3.geoCentroid(geom));
    } else {
      var areas = [];
      for (var j = 0; j < geom.coordinates.length; j++) {
        areas.push(path.area({
          type: geom.type,
          coordinates: [geom.coordinates[j]]
        }));
      }
      // const ix_max = areas.indexOf(max_fast(areas));
      centroids.push(d3.geoCentroid({
        type: geom.type,
        coordinates: [geom.coordinates[areas.indexOf(max_fast(areas))]]
      }));
    }
  }
  return centroids;
}

function make_prop_line(rendering_params, geojson_line_layer) {
  var layer = rendering_params.ref_layer_name,
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
    var make_geojson_line_layer = function make_geojson_line_layer() {
      var ref_layer_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path');
      var result = [];

      for (var i = 0, n_features = ref_layer_selection.length; i < n_features; ++i) {
        var ft = ref_layer_selection[i].__data__,
            value = +ft.properties[field];
        var new_obj = {
          id: i,
          type: 'Feature',
          properties: {},
          geometry: cloneObj(ft.geometry)
        };
        if (f_ix_len) {
          for (var f_ix = 0; f_ix < f_ix_len; f_ix++) {
            new_obj.properties[fields_id[f_ix]] = ft.properties[fields_id[f_ix]];
          }
        }
        new_obj.properties[field] = value;
        new_obj.properties[t_field_name] = propSize.scale(value);
        new_obj.properties.color = get_color(value, i);
        if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
        result.push([value, new_obj]);
      }
      result.sort(function (a, b) {
        return abs(b[0]) - abs(a[0]);
      });
      return {
        type: 'FeatureCollection',
        features: result.map(function (d) {
          return d[1];
        })
      };
    };

    var fields_id = getFieldsType('id', layer).concat(getFieldsType('category', layer));
    var f_ix_len = fields_id ? fields_id.length : 0;
    var get_color = void 0,
        col1 = void 0,
        col2 = void 0;
    if (rendering_params.break_val !== undefined && rendering_params.fill_color.two) {
      col1 = rendering_params.fill_color.two[0];
      col2 = rendering_params.fill_color.two[1];
      get_color = function get_color(val, ix) {
        return val > rendering_params.break_val ? col2 : col1;
      };
    } else if (rendering_params.fill_color instanceof Array && rendering_params.fill_color.length === nb_features) {
      get_color = function get_color(val, ix) {
        return rendering_params.fill_color[ix];
      };
    } else {
      get_color = function get_color() {
        return rendering_params.fill_color;
      };
    }

    geojson_line_layer = make_geojson_line_layer();
  }
  var require_clip_path = isInterrupted(current_proj_name.toLowerCase()) || current_proj_name.toLowerCase().indexOf('conicconformal') > -1 ? 'url(#clip)' : null;
  var layer_id = encodeId(layer_to_add);
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  result_data[layer_to_add] = [];
  map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer', 'clip-path': require_clip_path }).styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }).selectAll('path').data(geojson_line_layer.features).enter().append('path').attr('d', path).styles(function (d) {
    result_data[layer_to_add].push(d.properties);
    return {
      fill: 'transparent', stroke: d.properties.color, 'stroke-width': d.properties[t_field_name] };
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

  if (rendering_params.fill_color.two !== undefined) {
    current_layers[layer_to_add].fill_color = cloneObj(rendering_params.fill_color);
  } else if (rendering_params.fill_color instanceof Array) {
    current_layers[layer_to_add].fill_color = {
      class: geojson_line_layer.features.map(function (v) {
        return v.properties.color;
      })
    };
  } else {
    current_layers[layer_to_add].fill_color = { single: rendering_params.fill_color };
  }
  if (rendering_params.break_val !== undefined) {
    current_layers[layer_to_add].break_val = rendering_params.break_val;
  }
  create_li_layer_elem(layer_to_add, nb_features, ['Line', 'prop'], 'result');
}

function make_prop_symbols(rendering_params, _pt_layer) {
  var layer = rendering_params.ref_layer_name,
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
      propSize = new PropSizer(ref_value, ref_size, symbol_type),
      warn_empty_features = [];
  var geojson_pt_layer = void 0;

  if (!_pt_layer) {
    var make_geojson_pt_layer = function make_geojson_pt_layer() {
      var ref_layer_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path');
      var result = [];
      for (var i = 0, n_features = ref_layer_selection.length; i < n_features; ++i) {
        var ft = ref_layer_selection[i].__data__;
        var value = +ft.properties[field];
        var new_obj = {
          id: i,
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point' }
        };
        if (!ft.geometry) {
          warn_empty_features.push([i, ft]);
        } else if (ft.geometry.type.indexOf('Multi') < 0) {
          if (f_ix_len) {
            for (var f_ix = 0; f_ix < f_ix_len; f_ix++) {
              new_obj.properties[fields_id[f_ix]] = ft.properties[fields_id[f_ix]];
            }
          }
          new_obj.properties[field] = value;
          new_obj.properties[t_field_name] = propSize.scale(value);
          new_obj.geometry.coordinates = d3.geoCentroid(ft.geometry);
          new_obj.properties.color = get_color(value, i);
          if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
          result.push([value, new_obj]);
        } else {
          var areas = [];
          for (var j = 0; j < ft.geometry.coordinates.length; j++) {
            areas.push(path.area({
              type: ft.geometry.type,
              coordinates: [ft.geometry.coordinates[j]]
            }));
          }
          var ix_max = areas.indexOf(max_fast(areas));
          if (f_ix_len) {
            for (var _f_ix = 0; _f_ix < f_ix_len; _f_ix++) {
              new_obj.properties[fields_id[_f_ix]] = ft.properties[fields_id[_f_ix]];
            }
          }
          new_obj.properties[field] = value;
          new_obj.properties[t_field_name] = propSize.scale(value);
          new_obj.geometry.coordinates = d3.geoCentroid({
            type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
          new_obj.properties.color = get_color(value, i);
          if (color_field) new_obj.properties[color_field] = ft.properties[color_field];
          result.push([value, new_obj]);
        }
      }
      result.sort(function (a, b) {
        return abs(b[0]) - abs(a[0]);
      });
      return {
        type: 'FeatureCollection',
        features: result.map(function (d) {
          return d[1];
        })
      };
    };

    var fields_id = getFieldsType('id', layer).concat(getFieldsType('category', layer));
    var f_ix_len = fields_id ? fields_id.length : 0;
    var get_color = void 0,
        col1 = void 0,
        col2 = void 0;

    if (rendering_params.break_val !== undefined && rendering_params.fill_color.two) {
      col1 = rendering_params.fill_color.two[0];
      col2 = rendering_params.fill_color.two[1];
      get_color = function get_color(val, ix) {
        return val > rendering_params.break_val ? col2 : col1;
      };
    } else if (rendering_params.fill_color instanceof Array && rendering_params.fill_color.length === nb_features) {
      get_color = function get_color(val, ix) {
        return rendering_params.fill_color[ix];
      };
    } else {
      get_color = function get_color() {
        return rendering_params.fill_color;
      };
    }
    geojson_pt_layer = make_geojson_pt_layer();
  } else {
    geojson_pt_layer = _pt_layer;
  }

  var layer_id = encodeId(layer_to_add);
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  result_data[layer_to_add] = [];
  if (symbol_type === 'circle') {
    map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer no_clip' }).selectAll('circle').data(geojson_pt_layer.features).enter().append('circle').attrs(function (d, i) {
      result_data[layer_to_add].push(d.properties);
      return {
        id: ['PropSymbol_', i, ' feature_', d.id].join(''),
        r: d.properties[t_field_name],
        cx: path.centroid(d)[0],
        cy: path.centroid(d)[1]
      };
    }).style('fill', function (d) {
      return d.properties.color;
    }).style('stroke', 'black').style('stroke-width', 1 / zs).call(drag_elem_geo2);
  } else if (symbol_type === 'rect') {
    map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer no_clip' }).selectAll('circle').data(geojson_pt_layer.features).enter().append('rect').attrs(function (d, i) {
      var size = d.properties[t_field_name];
      result_data[layer_to_add].push(d.properties);
      return {
        id: ['PropSymbol_', i, ' feature_', d.id].join(''),
        height: size,
        width: size,
        x: path.centroid(d)[0] - size / 2,
        y: path.centroid(d)[1] - size / 2
      };
    }).style('fill', function (d) {
      return d.properties.color;
    }).style('stroke', 'black').style('stroke-width', 1 / zs).call(drag_elem_geo2);
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

  if (rendering_params.fill_color.two !== undefined) {
    current_layers[layer_to_add].fill_color = cloneObj(rendering_params.fill_color);
  } else if (rendering_params.fill_color instanceof Array) {
    current_layers[layer_to_add].fill_color = {
      class: geojson_pt_layer.features.map(function (v) {
        return v.properties.color;
      })
    };
  } else {
    current_layers[layer_to_add].fill_color = { single: rendering_params.fill_color };
  }
  if (rendering_params.break_val !== undefined) {
    current_layers[layer_to_add].break_val = rendering_params.break_val;
  }
  create_li_layer_elem(layer_to_add, nb_features, ['Point', 'prop'], 'result');

  if (warn_empty_features.length > 0) {
    display_warning_empty_geom(warn_empty_features);
  }
}

function render_categorical(layer, rendering_params) {
  var layer_name = void 0;
  if (rendering_params.new_name) {
    var fields = [].concat(getFieldsType('id', layer), rendering_params.rendered_field);
    copy_layer(layer, rendering_params.new_name, 'typo', fields);
    current_layers[rendering_params.new_name].key_name = current_layers[layer].key_name;
    current_layers[rendering_params.new_name].type = current_layers[layer].type;
    layer_name = rendering_params.new_name;
  } else {
    layer_name = layer;
  }

  var colorsByFeature = rendering_params.colorByFeature,
      color_map = rendering_params.color_map,
      field = rendering_params.rendered_field;
  var layer_to_render = map.select('#' + _app.layer_to_id.get(layer_name));
  layer_to_render.style('opacity', 1).style('stroke-width', 0.75 / d3.zoomTransform(svg_map).k + 'px');
  if (current_layers[layer_name].type === 'Line') {
    layer_to_render.selectAll('path').styles({ fill: 'transparent', 'stroke-opacity': 1 }).style('stroke', function (_, i) {
      return colorsByFeature[i];
    });
  } else {
    layer_to_render.selectAll('path').style('fill', function (_, i) {
      return colorsByFeature[i];
    }).styles({ 'fill-opacity': 0.9, 'stroke-opacity': 0.9, stroke: '#000' });
  }
  current_layers[layer_name].renderer = rendering_params.renderer;
  current_layers[layer_name].rendered_field = field;
  current_layers[layer_name].fill_color = { class: rendering_params.colorByFeature };
  current_layers[layer_name]['stroke-width-const'] = 0.75;
  current_layers[layer_name].is_result = true;
  current_layers[layer_name].color_map = color_map;
  zoom_without_redraw();
}

// Function to render the `layer` according to the `rendering_params`
// (layer should be the name of group of path, ie. not a PropSymbol layer)
// Currently used fo "choropleth", "MTA - relative deviations", "gridded map" functionnality
function render_choro(layer, rendering_params) {
  var layer_name = void 0;
  if (rendering_params.new_name) {
    var fields = [].concat(getFieldsType('id', layer), rendering_params.rendered_field);
    copy_layer(layer, rendering_params.new_name, 'choro', fields);
    // Assign the same key to the cloned layer so it could be used transparently on server side
    // after deletion of the reference layer if needed :
    current_layers[rendering_params.new_name].key_name = current_layers[layer].key_name;
    current_layers[rendering_params.new_name].type = current_layers[layer].type;
    layer_name = rendering_params.new_name;
  } else {
    layer_name = layer;
  }
  var breaks = rendering_params.breaks;
  var options_disc = {
    schema: rendering_params.schema,
    colors: rendering_params.colors,
    no_data: rendering_params.no_data,
    type: rendering_params.type,
    breaks: breaks,
    extra_options: rendering_params.extra_options
  };
  var layer_to_render = map.select('#' + _app.layer_to_id.get(layer_name));
  layer_to_render.style('opacity', 1).style('stroke-width', 0.75 / d3.zoomTransform(svg_map).k + 'px');
  if (current_layers[layer_name].type === 'Line') {
    layer_to_render.selectAll('path').styles({ fill: 'transparent', 'stroke-opacity': 1 }).style('stroke', function (d, i) {
      return rendering_params.colorsByFeature[i];
    });
  } else {
    layer_to_render.selectAll('path').styles({ 'fill-opacity': 1, 'stroke-opacity': 1, stroke: '#000' }).style('fill', function (d, i) {
      return rendering_params.colorsByFeature[i];
    });
  }
  current_layers[layer_name].renderer = rendering_params.renderer;
  current_layers[layer_name].rendered_field = rendering_params.rendered_field;
  current_layers[layer_name].fill_color = { class: rendering_params.colorsByFeature };
  current_layers[layer_name]['stroke-width-const'] = 0.75;
  current_layers[layer_name].is_result = true;
  current_layers[layer_name].options_disc = options_disc;
  var colors_breaks = [];
  for (var i = breaks.length - 1; i > 0; --i) {
    colors_breaks.push([[breaks[i - 1], ' - ', breaks[i]].join(''), rendering_params.colors[i - 1]]);
  }
  current_layers[layer_name].colors_breaks = colors_breaks;
  zoom_without_redraw();
}

function render_mini_chart_serie(values, parent, max_h, nb_bins) {
  var bins = nb_bins || (values.length > 20 ? 16 : undefined) || (values.length > 15 ? 10 : 5);
  var class_count = getBinsCount(values, bins),
      background = '#f1f1f1',
      color = '#6633ff',
      width = 3 * bins - 3,
      height = 25,
      canvas = document.createElement('canvas');
  var cap = max_h || max_fast(class_count.counts);
  canvas.width = width;
  canvas.height = height;

  var old = parent.querySelector('canvas');
  if (old) old.remove();
  parent.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var barwidth = 2;
  var barspace = 1;
  var x = 0;

  ctx.fillStyle = color;
  for (var i = 0; i < bins; i++) {
    var barheight = Math.floor(Math.min(class_count.counts[i] / cap, 1) * (height - 1));
    x += barspace;
    ctx.fillRect(x, height, barwidth, -barheight);
    x += barwidth;
  }
  canvas.setAttribute('tooltip-info', make_mini_summary(class_count));
  var _ = new Tooltip(canvas, {
    dataAttr: 'tooltip-info',
    animation: 'slideNfade',
    duration: 50,
    delay: 100,
    container: document.getElementById('twbs'),
    placement: 'top'
  });
}

function make_mini_summary(summary) {
  var p = Math.max(get_nb_decimals(summary.min), get_nb_decimals(summary.max));
  var props = {
    min: summary.min,
    max: summary.max,
    mean: summary.mean.toFixed(p),
    median: summary.median.toFixed(p),
    stddev: summary.stddev.toFixed(p)
  };
  return i18next.t('app_page.stat_summary.mini_summary', props);
}

function fillMenu_PropSymbolTypo(layer) {
  var dv2 = make_template_functionnality(section2);

  var a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.field1' }).html(i18next.t('app_page.func_options.proptypo.field1'));
  a.insert('select').attrs({ class: 'params', id: 'PropSymbolTypo_field_1' });

  var b = dv2.append('p').attr('class', 'params_section2');
  b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.fixed_size' }).html(i18next.t('app_page.func_options.proptypo.fixed_size'));
  b.insert('input').attrs({ type: 'number',
    class: 'params',
    id: 'PropSymbolTypo_ref_size',
    min: 0.1,
    max: 100.0,
    value: 60.0,
    step: 'any' }).style('width', '50px');
  b.append('span').html(' (px)');

  var c = dv2.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.on_value' }).html(i18next.t('app_page.func_options.proptypo.on_value'));
  c.insert('input').styles({ width: '100px', 'margin-left': '10px' }).attrs({ type: 'number', class: 'params', id: 'PropSymbolTypo_ref_value' }).attrs({ min: 0.1, step: 0.1 });

  // Other symbols could probably easily be proposed :
  var d = dv2.append('p').attr('class', 'params_section2');
  d.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.symbol_type' }).html(i18next.t('app_page.func_options.proptypo.symbol_type'));
  d.insert('select').attrs({ class: 'params', id: 'PropSymbolTypo_symbol_type' });

  var e = dv2.append('p').attr('class', 'params_section2');
  e.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.proptypo.field2' }).html(i18next.t('app_page.func_options.proptypo.field2'));
  e.insert('select').attrs({ class: 'params', id: 'PropSymbolTypo_field_2' });

  var f = dv2.insert('p').styles({ margin: 'auto', 'text-align': 'center' });
  f.append('button').attrs({ id: 'Typo_class',
    class: 'button_disc params i18n',
    'data-i18n': '[html]app_page.func_options.typo.color_choice' }).styles({ 'font-size': '0.8em', 'text-align': 'center' }).html(i18next.t('app_page.func_options.typo.color_choice'));

  make_layer_name_button(dv2, 'PropSymbolTypo_output_name');
  make_ok_button(dv2, 'propTypo_yes');
  section2.selectAll('.params').attr('disabled', true);
}

function prepare_categories_array(layer_name, selected_field, col_map) {
  var cats = [];
  if (!col_map) {
    var _col_map = new Map();
    for (var i = 0, data_layer = user_data[layer_name]; i < data_layer.length; ++i) {
      var value = data_layer[i][selected_field],
          ret_val = _col_map.get(value);
      _col_map.set(value, ret_val ? [ret_val[0] + 1, [i].concat(ret_val[1])] : [1, [i]]);
    }
    _col_map.forEach(function (v, k) {
      cats.push({ name: k, display_name: k, nb_elem: v[0], color: randomColor() });
    });
    _col_map = new Map();
    for (var _i7 = 0; _i7 < cats.length; _i7++) {
      _col_map.set(cats[_i7].name, [cats[_i7].color, cats[_i7].name, cats[_i7].nb_elem]);
    }
    return [cats, _col_map];
  }
  col_map.forEach(function (v, k) {
    cats.push({ name: k, display_name: v[1], nb_elem: v[2], color: v[0] });
  });
  return [cats, col_map];
}

var fields_PropSymbolTypo = {
  fill: function fill(layer) {
    if (!layer) return;
    section2.selectAll('.params').attr('disabled', null);
    var self = this,
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

    var prepare_colors = function prepare_colors(field) {
      var _prepare_categories_a5 = prepare_categories_array(layer, field, null),
          _prepare_categories_a6 = _slicedToArray(_prepare_categories_a5, 2),
          cats = _prepare_categories_a6[0],
          col_map = _prepare_categories_a6[1];

      var nb_class = col_map.size;
      var colorByFeature = user_data[layer].map(function (ft) {
        return col_map.get(ft[field])[0];
      });
      self.rendering_params[field] = {
        nb_class: nb_class,
        color_map: col_map,
        colorByFeature: colorByFeature,
        renderer: 'Categorical',
        rendered_field: field,
        skip_alert: false
      };
    };

    if (fields_categ.length === 0 || fields_num.length === 0) {
      display_error_num_field();
      return;
    }

    if (current_layers[layer].type === 'Line') {
      ref_size.attr('value', 10.0);
      [['app_page.func_options.common.symbol_line', 'line'], ['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    } else {
      ref_size.attr('value', 60.0);
      [['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    }

    fields_num.forEach(function (field) {
      field1_selec.append('option').text(field).attr('value', field);
    });

    fields_categ.forEach(function (field) {
      field2_selec.append('option').text(field).attr('value', field);
    });

    // Set some default colors in order to not force to open the box for selecting them :
    {
      var first_field = fields_categ[0];
      prepare_colors(first_field);
      ok_button.attr('disabled', self.rendering_params[first_field] ? null : true);
    }

    field1_selec.on('change', function () {
      var field_name = this.value,
          max_val_field = max_fast(user_data[layer].map(function (obj) {
        return +obj[field_name];
      }));
      ref_value_field.attrs({ max: max_val_field, value: max_val_field });
      uo_layer_name.attr('value', ['Typo', field_name, field2_selec.node().value, layer].join('_'));
    });

    field2_selec.on('change', function () {
      var field_name = this.value;
      prepare_colors(field_name);
      // ok_button.attr("disabled", self.rendering_params[field_name] ? null : true);
      uo_layer_name.attr('value', ['Typo', field1_selec.node().value, field_name, layer].join('_'));
    });

    btn_typo_class.on('click', function () {
      var selected_field = field2_selec.node().value,
          new_layer_name = check_layer_name(['Typo', field1_selec.node().value, selected_field, layer].join('_'));
      var col_map = self.rendering_params[selected_field] ? self.rendering_params[selected_field].color_map : undefined;

      var _prepare_categories_a7 = prepare_categories_array(layer, selected_field, col_map),
          _prepare_categories_a8 = _slicedToArray(_prepare_categories_a7, 2),
          cats = _prepare_categories_a8[0],
          c_map = _prepare_categories_a8[1];

      if (cats.length > 15) {
        swal({ title: '',
          text: i18next.t('app_page.common.error_too_many_features_color'),
          type: 'warning',
          showCancelButton: true,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.valid') + '!',
          cancelButtonText: i18next.t('app_page.common.cancel')
        }).then(function () {
          display_categorical_box(user_data[layer], layer, selected_field, cats).then(function (confirmed) {
            if (confirmed) {
              // ok_button.attr("disabled", null);
              self.rendering_params[selected_field] = {
                nb_class: confirmed[0],
                color_map: confirmed[1],
                colorByFeature: confirmed[2],
                renderer: 'Categorical',
                rendered_field: selected_field,
                new_name: new_layer_name,
                skip_alert: true
              };
            }
          });
        }, function (dismiss) {
          return null;
        });
      } else {
        display_categorical_box(user_data[layer], layer, selected_field, cats).then(function (confirmed) {
          if (confirmed) {
            // ok_button.attr("disabled", null);
            self.rendering_params[selected_field] = {
              nb_class: confirmed[0],
              color_map: confirmed[1],
              colorByFeature: confirmed[2],
              renderer: 'Categorical',
              rendered_field: selected_field,
              new_name: new_layer_name,
              skip_alert: true
            };
          }
        });
      }
    });

    ok_button.on('click', function () {
      var render = function render() {
        render_PropSymbolTypo(field1_selec.node().value, field2_selec.node().value, uo_layer_name.node().value, ref_value_field.node().value, section2.select('#PropSymbolTypo_ref_size').node().value, section2.select('#PropSymbolTypo_symbol_type').node().value);
      };
      var field_color = field2_selec.node().value;
      if (self.rendering_params[field_color].color_map.size > 15 && !self.rendering_params[field_color].skip_alert) {
        swal({ title: '',
          text: i18next.t('app_page.common.error_too_many_features_color'),
          type: 'warning',
          showCancelButton: true,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.valid') + '!',
          cancelButtonText: i18next.t('app_page.common.cancel')
        }).then(function () {
          render();
        }, function (dismiss) {
          return null;
        });
      } else {
        render();
      }
    });
    setSelected(field1_selec.node(), fields_num[0]);
    setSelected(field2_selec.node(), fields_categ[0]);
  },

  unfill: function unfill() {
    unfillSelectInput(document.getElementById('PropSymbolTypo_field_1'));
    unfillSelectInput(document.getElementById('PropSymbolTypo_field_2'));
    unfillSelectInput(document.getElementById('PropSymbolTypo_symbol_type'));
    section2.selectAll('.params').attr('disabled', true);
  },
  rendering_params: {}
};

function render_PropSymbolTypo(field1, color_field, n_layer_name, ref_value, ref_size, symb_selec) {
  if (!ref_value || !color_field || !fields_PropSymbolTypo.rendering_params[color_field]) {
    return;
  }
  var layer = Object.getOwnPropertyNames(user_data)[0],
      nb_features = user_data[layer].length,
      rendering_params = fields_PropSymbolTypo.rendering_params[color_field],
      rd_params = {};

  var new_layer_name = check_layer_name(n_layer_name.length > 0 ? n_layer_name : ['PropSymbolsTypo', field1, color_field, layer].join('_'));

  rd_params.field = field1;
  rd_params.new_name = new_layer_name;
  rd_params.nb_features = nb_features;
  rd_params.ref_layer_name = layer;
  rd_params.symbol = symb_selec;
  rd_params.ref_value = +ref_value;
  rd_params.color_field = color_field;
  rd_params.ref_size = +ref_size;
  rd_params.fill_color = rendering_params.colorByFeature;

  if (symb_selec === 'line') {
    make_prop_line(rd_params);
  } else {
    make_prop_symbols(rd_params);
  }

  Object.assign(current_layers[new_layer_name], {
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

  var a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.field' }).html(i18next.t('app_page.func_options.discont.field'));
  a.insert('select').attrs({ class: 'params', id: 'field_Discont' });

  // let b = dv2.append('p').attr('class', 'params_section2');
  // b.append('span')
  //   .attrs({class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.id_field'})
  //   .html(i18next.t('app_page.func_options.discont.id_field'));
  // b.insert('select')
  //   .attrs({class: 'params', id: 'field_id_Discont'});

  var c = dv2.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.type_discontinuity' }).html(i18next.t('app_page.func_options.discont.type_discontinuity'));
  var discontinuity_type = c.insert('select').attrs({ class: 'params i18n', id: 'kind_Discont' });

  [['app_page.func_options.discont.type_relative', 'rel'], ['app_page.func_options.discont.type_absolute', 'abs']].forEach(function (k) {
    discontinuity_type.append('option').text(i18next.t(k[0])).attrs({ value: k[1], 'data-i18n': '[text]' + k[0] });
  });

  // let d = dv2.append('p').attr('class', 'params_section2');
  // d.append('span')
  //   .attrs({class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.nb_class'})
  //   .html(i18next.t('app_page.func_options.discont.nb_class'));
  // d.insert('input')
  //   .attrs({type: 'number', class: 'params', id: 'Discont_nbClass', min: 1, max: 33, value: 4})
  //   .style('width', '50px');

  var e = dv2.append('p').attr('class', 'params_section2');
  e.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.discretization' }).html(i18next.t('app_page.func_options.discont.discretization'));
  var disc_type = e.insert('select').attrs({ class: 'params i18n', id: 'Discont_discKind' });

  [['app_page.common.equal_interval', 'equal_interval'], ['app_page.common.quantiles', 'quantiles'], ['app_page.common.Q6', 'Q6'], ['app_page.common.arithmetic_progression', 'arithmetic_progression'], ['app_page.common.jenks', 'jenks']].forEach(function (field) {
    disc_type.append('option').text(i18next.t(field[0])).attrs({ value: field[1], 'data-i18n': '[text]' + field[0] });
  });

  var f = dv2.append('p').attr('class', 'params_section2');
  f.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.discont.color' }).html(i18next.t('app_page.func_options.discont.color'));
  f.insert('input').attrs({ class: 'params', id: 'color_Discont', type: 'color', value: ColorsSelected.random() });

  make_layer_name_button(dv2, 'Discont_output_name');
  make_ok_button(dv2, 'yes_Discont', false);

  dv2.selectAll('.params').attr('disabled', true);
}

var fields_Discont = {
  fill: function fill(layer) {
    if (!layer) return;
    var fields_num = getFieldsType('stock', layer).concat(getFieldsType('ratio', layer)),
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
      var field_name = field_discont.node().value;
      document.getElementById('Discont_output_name').value = ['Disc', field_name, this.value, layer].join('_');
    });

    fields_num.forEach(function (field) {
      field_discont.append('option').text(field).attr('value', field);
    });
    // if (fields_id.length == 0) {
    //     field_id.append("option")
    //        .text(i18next.t("app_page.common.default"))
    //        .attrs({"value": "__default__", "class": "i18n",
    //                "data-i18n": "[text]app_page.common.default"});
    // } else {
    //   fields_id.forEach(function(field) {
    //       field_id.append("option").text(field).attr("value", field);
    //   });
    // }
    field_discont.on('change', function () {
      var discontinuity_type = document.getElementById('kind_Discont').value;
      document.getElementById('Discont_output_name').value = ['Disc', this.value, discontinuity_type, layer].join('_');
    });
    ok_button.on('click', render_discont);
    section2.selectAll('.params').attr('disabled', null);
    document.getElementById('Discont_output_name').value = ['Disc', field_discont.node().value, select_type_discont.node().value, layer].join('_');
  },
  unfill: function unfill() {
    unfillSelectInput(document.getElementById('field_Discont'));
    // unfillSelectInput(document.getElementById("field_id_Discont"));
    section2.selectAll('.params').attr('disabled', true);
  }
};

var render_discont = function render_discont() {
  var layer = Object.getOwnPropertyNames(user_data)[0],
      field = document.getElementById('field_Discont').value,

  // field_id = document.getElementById("field_id_Discont").value,
  min_size = 1,
      max_size = 10,
      discontinuity_type = document.getElementById('kind_Discont').value,
      discretization_type = document.getElementById('Discont_discKind').value,
      nb_class = 4,
      user_color = document.getElementById('color_Discont').value;
  var new_layer_name = document.getElementById('Discont_output_name').value;

  new_layer_name = check_layer_name(new_layer_name.length > 0 ? new_layer_name : ['Disc', field, discontinuity_type, layer].join('_'));

  var id_layer = encodeId(new_layer_name);
  _app.layer_to_id.set(new_layer_name, id_layer);
  _app.id_to_layer.set(id_layer, new_layer_name);

  // This is the "id" field used to make a new id for the discontinuity line
  // created in this function (by taking the id of the two nearby feature).
  // We don't let the user choose it anymore but we might change that
  // it just stay as 'undefined' for now:
  var field_id = undefined;
  // field_id = field_id == "__default__" ? undefined : field_id;

  var result_value = new Map(),
      result_geom = {},
      topo_mesh = topojson.mesh,
      math_max = Math.max,
      topo_to_use = _target_layer_file;

  document.getElementById('overlay').style.display = '';

  // Discontinuity are computed in another thread to avoid blocking the ui
  // (a waiting message is displayed during this time to avoid action from the user)
  var discont_worker = new Worker('static/js/webworker_discont.js');
  _app.webworker_to_cancel = discont_worker;
  discont_worker.postMessage([topo_to_use, layer, field, discontinuity_type, discretization_type, field_id]);
  discont_worker.onmessage = function (e) {
    var _e$data = _slicedToArray(e.data, 2),
        arr_tmp = _e$data[0],
        d_res = _e$data[1];

    _app.webworker_to_cancel = undefined;
    var nb_ft = arr_tmp.length,
        step = (max_size - min_size) / (nb_class - 1),
        class_size = Array(nb_class).fill(0).map(function (d, i) {
      return min_size + i * step;
    });

    var _discretize_to_size = discretize_to_size(arr_tmp, discretization_type, nb_class, min_size, max_size),
        _discretize_to_size2 = _slicedToArray(_discretize_to_size, 4),
        breaks = _discretize_to_size2[2],
        serie = _discretize_to_size2[3];

    if (!serie || !breaks) {
      var opt_nb_class = Math.floor(1 + 3.3 * Math.log10(nb_ft));
      var w = nb_class > opt_nb_class ? i18next.t('app_page.common.smaller') : i18next.t('app_page.common.larger');
      swal('', i18next.t('app_page.common.error_discretization', { arg: w }), 'error');
      return;
    }
    var require_clip_path = isInterrupted(current_proj_name.toLowerCase()) || current_proj_name.toLowerCase().indexOf('conicconformal') > -1 ? 'url(#clip)' : null;
    breaks = breaks.map(function (ft) {
      return [ft[0], ft[1]];
    }).filter(function (d) {
      return d[1] !== undefined;
    });
    result_data[new_layer_name] = [];
    var result_layer = map.insert('g', '.legend').attrs({ id: id_layer, class: 'layer', 'clip-path': require_clip_path }).styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    var data_result = result_data[new_layer_name];
    var result_lyr_node = result_layer.node();

    for (var i = 0; i < nb_ft; i++) {
      var val = d_res[i][0];
      var p_size = class_size[serie.getClass(val)];
      var elem = result_layer.append('path').datum(d_res[i][2]).attrs({ d: path, id: ['feature', i].join('_') }).styles({ stroke: user_color, 'stroke-width': p_size, fill: 'transparent', 'stroke-opacity': 1 });
      var elem_data = elem.node().__data__;
      data_result.push(d_res[i][1]);
      elem_data.geometry = d_res[i][2];
      elem_data.properties = data_result[i];
      elem_data.properties.prop_val = p_size;
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
      fill_color: { single: user_color },
      n_features: nb_ft
    };
    create_li_layer_elem(new_layer_name, nb_ft, ['Line', 'discont'], 'result');

    {
      // Only display the 50% most important values :
      // TODO : reintegrate this upstream in the layer creation :
      var lim = 0.5 * current_layers[new_layer_name].n_features;
      result_layer.selectAll('path').style('display', function (_, i) {
        return i <= lim ? null : 'none';
      });
      current_layers[new_layer_name].min_display = 0.5;
    }

    d3.select('#layer_to_export').append('option').attr('value', new_layer_name).text(new_layer_name);
    zoom_without_redraw();
    switch_accordion_section();
    handle_legend(new_layer_name);
    send_layer_server(new_layer_name, '/layers/add');
    discont_worker.terminate();
  };
};

function fillMenu_PropSymbol(layer) {
  var dialog_content = make_template_functionnality(section2),
      max_allowed_size = Math.round(h / 2 - h / 10);

  var a = dialog_content.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' }).html(i18next.t('app_page.func_options.common.field'));
  a.insert('select').attrs({ class: 'params', id: 'PropSymbol_field_1' });

  var b = dialog_content.append('p').attr('class', 'params_section2');
  b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.fixed_size' }).html(i18next.t('app_page.func_options.prop.fixed_size'));
  b.insert('input').attrs({ id: 'PropSymbol_ref_size', type: 'number', class: 'params', min: 0.2, max: max_allowed_size, value: 60.0, step: 0.1 }).style('width', '50px');
  b.append('span').html(' px');

  var c = dialog_content.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.on_value' }).html(i18next.t('app_page.func_options.prop.on_value'));
  c.insert('input').styles({ width: '100px', 'margin-left': '10px' }).attrs({ id: 'PropSymbol_ref_value', type: 'number', class: 'params', min: 0.1, step: 0.1 });

  var d = dialog_content.append('p').attr('class', 'params_section2');
  d.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.symbol_type' }).html(i18next.t('app_page.func_options.prop.symbol_type'));
  d.insert('select').attrs({ class: 'params i18n', id: 'PropSymbol_symbol' });

  // [['app_page.func_options.common.symbol_circle', 'circle'],
  //  ['app_page.func_options.common.symbol_square', 'rect']
  // ].forEach(function(symb) {
  //     symb_selec.append("option")
  //       .text(i18next.t(symb[0])).attrs({"value": symb[1], 'data-i18n': `[text]${symb[0]}`});});

  var color_section = dialog_content.append('p').attr('class', 'params_section2');
  color_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.symbol_color' }).html(i18next.t('app_page.func_options.prop.symbol_color'));
  var color_par = color_section.append('select').attrs({ id: 'PropSymbol_nb_colors', class: 'params' });
  color_par.append('option').attrs({ value: 1, class: 'i18n', 'data-i18n': '[text]app_page.func_options.prop.options_one_color' }).text(i18next.t('app_page.func_options.prop.options_one_color'));
  color_par.append('option').attrs({ value: 2, class: 'i18n', 'data-i18n': '[text]app_page.func_options.prop.options_two_colors' }).text(i18next.t('app_page.func_options.prop.options_two_colors'));

  var col_p = dialog_content.append('p').attr('class', 'params_section2').styles({ 'padding-top': '5px', 'margin-bottom': '-5px', 'text-align': 'center' });
  col_p.insert('input').styles({ position: 'unset' }).attrs({ type: 'color', class: 'params', id: 'PropSymbol_color1', value: ColorsSelected.random() });
  col_p.insert('input').styles({ display: 'none', position: 'unset' }).attrs({ type: 'color', class: 'params', id: 'PropSymbol_color2', value: ColorsSelected.random() });

  var col_b = dialog_content.insert('p').attr('class', 'params_section2');
  col_b.insert('span').style('display', 'none').attrs({ id: 'PropSymbol_color_txt', class: 'i18n', 'data-i18n': '[html]app_page.func_options.prop.options_break_two_colors' }).html(i18next.t('app_page.func_options.prop.options_break_two_colors'));
  col_b.insert('input').attrs({ id: 'PropSymbol_break_val', type: 'number', class: 'params' }).styles({ display: 'none', width: '75px' });

  make_layer_name_button(dialog_content, 'PropSymbol_output_name');
  make_ok_button(dialog_content, 'PropSymbol_yes', false);
  dialog_content.selectAll('.params').attr('disabled', true);
}

var fields_PropSymbol = {
  fill: function fill(layer) {
    if (!layer) return;
    section2.selectAll('.params').attr('disabled', null);
    var fields = getFieldsType('stock', layer),
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
      [['app_page.func_options.common.symbol_line', 'line'], ['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    } else {
      ref_size.attr('value', 60.0);
      [['app_page.func_options.common.symbol_circle', 'circle'], ['app_page.func_options.common.symbol_square', 'rect']].forEach(function (symb) {
        symb_selec.append('option').text(i18next.t(symb[0])).attrs({ value: symb[1], 'data-i18n': '[text]' + symb[0] });
      });
    }

    fields.forEach(function (field) {
      field_selec.append('option').text(field).attr('value', field);
    });

    field_selec.on('change', function () {
      var field_name = this.value,
          field_values = user_data[layer].map(function (obj) {
        return +obj[field_name];
      }),
          max_val_field = max_fast(field_values);
      uo_layer_name.attr('value', ['PropSymbol', this.value, layer].join('_'));
      ref_value_field.attrs({ max: max_val_field, value: max_val_field });
      if (has_negative(field_values)) {
        setSelected(nb_color.node(), 2);
        fill_color_opt.attr('value', 0);
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
      var field_to_render = field_selec.node().value,
          symbol_to_use = symb_selec.node().value,
          user_new_layer_name = uo_layer_name.node().value,
          new_layer_name = check_layer_name(user_new_layer_name.length > 0 ? user_new_layer_name : ['PropSymbols', field_to_render, layer].join('_'));
      var rendering_params = {
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
        rendering_params.break_val = +fill_color_opt.node().value;
        rendering_params.fill_color = { two: [fill_color.node().value, fill_color2.node().value] };
      }
      if (symbol_to_use === 'line') {
        make_prop_line(rendering_params);
      } else {
        make_prop_symbols(rendering_params);
      }
      zoom_without_redraw();
      switch_accordion_section();
      handle_legend(new_layer_name);
    });
    uo_layer_name.attr('value', ['PropSymbols', layer].join('_'));
    setSelected(field_selec.node(), fields[0]);
  },

  unfill: function unfill() {
    unfillSelectInput(document.getElementById('PropSymbol_field_1'));
    unfillSelectInput(document.getElementById('PropSymbol_symbol'));
    section2.selectAll('.params').attr('disabled', true);
  }
};

function fillMenu_TypoSymbol() {
  var dv2 = make_template_functionnality(section2);
  var a = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.typosymbol.field' }).html(i18next.t('app_page.func_options.typosymbol.field'));
  a.insert('select').attrs({ class: 'params', id: 'field_Symbol' });

  var b = dv2.insert('p').attr('class', 'params_section2').styles({ 'text-align': 'center', margin: 'auto' });
  b.append('button').attrs({ id: 'selec_Symbol',
    class: 'button_disc params i18n',
    'data-i18n': '[html]app_page.func_options.typosymbol.symbols_choice' }).styles({ 'font-size': '0.8em', 'text-align': 'center' }).html(i18next.t('app_page.func_options.typosymbol.symbols_choice'));

  make_layer_name_button(dv2, 'TypoSymbols_output_name');
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
  fill: function fill(layer) {
    if (!layer) return;
    var fields_all = Object.getOwnPropertyNames(user_data[layer][0]),
        field_to_use = section2.select('#field_Symbol'),
        selec_symbol = section2.select('#selec_Symbol'),
        uo_layer_name = section2.select('#TypoSymbols_output_name'),
        ok_button = section2.select('#yesTypoSymbols'),
        self = this;

    section2.selectAll('.params').attr('disabled', null);
    fields_all.forEach(function (field) {
      field_to_use.append('option').text(field).attr('value', field);
    });
    field_to_use.on('change', function () {
      var field = this.value;
      ok_button.attr('disabled', self.rendering_params[field] ? null : true);
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
      }).then(function () {
        var field = document.getElementById('field_Symbol').value;
        var symbol_map = self.rendering_params[field] ? self.rendering_params[field].symbols_map : undefined;
        display_box_symbol_typo(layer, field, symbol_map).then(function (confirmed) {
          if (confirmed) {
            document.getElementById('yesTypoSymbols').disabled = null;
            self.rendering_params[field] = {
              nb_cat: confirmed[0],
              symbols_map: confirmed[1],
              field: field
            };
          }
        });
      }, function () {
        return null;
      });
    });
    ok_button.on('click', function () {
      var field = field_to_use.node().value;
      render_TypoSymbols(self.rendering_params[field], uo_layer_name.node().value);
    });
    setSelected(field_to_use.node(), fields_all[0]);
    uo_layer_name.attr('value', ['Symbols', layer].join('_'));
  },
  unfill: function unfill() {
    unfillSelectInput(document.getElementById('field_Symbol'));
    section2.selectAll('.params').attr('disabled', true);
  },
  rendering_params: {}
};

function render_TypoSymbols(rendering_params, new_name) {
  var layer_name = Object.getOwnPropertyNames(user_data)[0];
  var ref_layer_id = _app.layer_to_id.get(layer_name);
  var field = rendering_params.field;
  var layer_to_add = check_layer_name(new_name.length > 0 ? new_name : ['Symbols', field, layer_name].join('_'));
  var ref_selection = document.getElementById(ref_layer_id).getElementsByTagName('path');
  var nb_ft = ref_selection.length;

  function make_geojson_pt_layer() {
    var result = [];
    for (var i = 0, nb_features = ref_selection.length; i < nb_features; ++i) {
      var ft = ref_selection[i].__data__;
      var value = ft.properties[field];
      var new_obj = {
        id: i,
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point' }
      };
      if (ft.geometry.type.indexOf('Multi') < 0) {
        new_obj.properties.symbol_field = value;
        new_obj.properties.id_parent = ft.id;
        new_obj.geometry.coordinates = d3.geoCentroid(ft.geometry);
        result.push(new_obj);
      } else {
        var areas = [];
        for (var j = 0; j < ft.geometry.coordinates.length; j++) {
          areas.push(path.area({
            type: ft.geometry.type,
            coordinates: [ft.geometry.coordinates[j]]
          }));
        }
        var ix_max = areas.indexOf(max_fast(areas));
        new_obj.properties.symbol_field = value;
        new_obj.properties.id_parent = ft.id;
        new_obj.geometry.coordinates = d3.geoCentroid({
          type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
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
  var context_menu = new ContextMenu();
  var getItems = function getItems(self_parent) {
    return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
        make_style_box_indiv_symbol(self_parent);
      } }, { name: i18next.t('app_page.common.delete'), action: function action() {
        self_parent.style.display = 'none';
      } }];
  };

  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);

  map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer no_clip' }).selectAll('image').data(new_layer_data.features).enter().insert('image').attrs(function (d) {
    var symb = rendering_params.symbols_map.get(d.properties.symbol_field),
        coords = path.centroid(d.geometry);
    return {
      x: coords[0] - symb[1] / 2,
      y: coords[1] - symb[1] / 2,
      width: symb[1],
      height: symb[1],
      'xlink:href': symb[0]
    };
  }).on('mouseover', function () {
    this.style.cursor = 'pointer';
  }).on('mouseout', function () {
    this.style.cursor = 'initial';
  }).on('contextmenu dblclick', function () {
    context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
  }).call(drag_elem_geo);

  create_li_layer_elem(layer_to_add, nb_ft, ['Point', 'symbol'], 'result');

  current_layers[layer_to_add] = {
    n_features: current_layers[layer_name].n_features,
    renderer: 'TypoSymbols',
    symbols_map: rendering_params.symbols_map,
    rendered_field: field,
    is_result: true,
    symbol: 'image',
    ref_layer_name: layer_name
  };
  handle_legend(layer_to_add);
  zoom_without_redraw();
  switch_accordion_section();
}

function fillMenu_griddedMap(layer) {
  var dialog_content = make_template_functionnality(section2);

  var a = dialog_content.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  a.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.common.field' }).html(i18next.t('app_page.func_options.common.field'));
  a.insert('select').attrs({ class: 'params', id: 'Gridded_field' });

  var b = dialog_content.append('p').attr('class', 'params_section2');
  b.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.cellsize' }).html(i18next.t('app_page.func_options.grid.cellsize'));
  b.insert('input').style('width', '100px').attrs({ type: 'number',
    class: 'params',
    id: 'Gridded_cellsize',
    value: 10.0,
    min: 1.000,
    max: 7000,
    step: 'any' });

  var c = dialog_content.append('p').attr('class', 'params_section2');
  c.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.shape' }).html(i18next.t('app_page.func_options.grid.shape'));

  var grid_shape = c.insert('select').attrs({ class: 'params i18n', id: 'Gridded_shape' });

  var d = dialog_content.append('p').attr('class', 'params_section2');
  d.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.grid.coloramp' }).html(i18next.t('app_page.func_options.grid.coloramp'));
  var col_pal = d.insert('select').attrs({ class: 'params', id: 'Gridded_color_pal' });

  ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'].forEach(function (color) {
    col_pal.append('option').text(color).attr('value', color);
  });

  [['app_page.func_options.grid.square', 'Square'], ['app_page.func_options.grid.diamond', 'Diamond'], ['app_page.func_options.grid.hexagon', 'Hexagon']].forEach(function (shape) {
    grid_shape.append('option').text(i18next.t(shape[0])).attrs({ value: shape[1], 'data-i18n': '[text]' + shape[0] });
  });

  make_layer_name_button(dialog_content, 'Gridded_output_name');
  make_ok_button(dialog_content, 'Gridded_yes', false);
  section2.selectAll('.params').attr('disabled', true);
}

var fields_griddedMap = {
  fill: function fill(layer) {
    if (!layer) return;

    // let fields = type_col(layer, "number"),
    var fields = getFieldsType('stock', layer),
        field_selec = section2.select('#Gridded_field'),
        output_name = section2.select('#Gridded_output_name'),
        grip_shape = section2.select('#Gridded_shape'),
        ok_button = section2.select('#Gridded_yes');

    fields.forEach(function (field) {
      field_selec.append('option').text(field).attr('value', field);
    });
    field_selec.on('change', function () {
      output_name.attr('value', ['Gridded', this.value, layer].join('_'));
    });
    ok_button.on('click', function () {
      render_Gridded(field_selec.node().value, document.getElementById('Gridded_cellsize').value, grip_shape.node().value, document.getElementById('Gridded_color_pal').value, output_name.node().value);
    });
    output_name.attr('value', ['Gridded', layer].join('_'));
    document.getElementById('Gridded_cellsize').value = get_first_guess_span('grid');
    section2.selectAll('.params').attr('disabled', null);
  },
  unfill: function unfill() {
    var field_selec = document.getElementById('Gridded_field');
    unfillSelectInput(field_selec);
    section2.selectAll('.params').attr('disabled', true);
  }
};

function render_Gridded(field_n, resolution, cell_shape, color_palette, new_user_layer_name) {
  var layer = Object.getOwnPropertyNames(user_data)[0],
      formToSend = new FormData(),
      var_to_send = {},
      res_test = test_maxmin_resolution(resolution);

  if (res_test) {
    var message = res_test === 'low' ? i18next.t('app_page.common.error_too_low_resolution') : i18next.t('app_page.common.error_too_high_resolution');
    display_error_during_computation(message);
    return;
  }

  if (current_layers[layer].original_fields.has(field_n)) {
    var_to_send[field_n] = [];
  } else {
    var_to_send[field_n] = user_data[layer].map(function (i) {
      return i[field_n];
    });
  }
  formToSend.append('json', JSON.stringify({
    topojson: current_layers[layer].key_name,
    var_name: var_to_send,
    cellsize: resolution * 1000,
    grid_shape: cell_shape
  }));
  xhrequest('POST', 'compute/gridded', formToSend, true).then(function (data) {
    var options = { result_layer_on_add: true, func_name: 'grid' };
    if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
      options.choosed_name = new_user_layer_name;
    }
    var rendered_field = field_n + '_densitykm';
    var n_layer_name = add_layer_topojson(data, options);
    if (!n_layer_name) return;
    var res_data = result_data[n_layer_name],
        nb_ft = res_data.length,
        opt_nb_class = Math.floor(1 + 3.3 * Math.log10(nb_ft)),
        d_values = [];

    for (var i = 0; i < nb_ft; i++) {
      d_values.push(+res_data[i][rendered_field]);
    }

    current_layers[n_layer_name].renderer = 'Gridded';
    var disc_result = discretize_to_colors(d_values, 'quantiles', opt_nb_class, color_palette);
    var rendering_params = {
      nb_class: opt_nb_class,
      type: 'quantiles',
      schema: [color_palette],
      breaks: disc_result[2],
      colors: disc_result[3],
      colorsByFeature: disc_result[4],
      renderer: 'Gridded',
      rendered_field: rendered_field
    };
    render_choro(n_layer_name, rendering_params);
    handle_legend(n_layer_name);
    switch_accordion_section();
  }, function (error) {
    display_error_during_computation();
    console.log(error);
  });
}

function fillMenu_FlowMap() {
  var dv2 = make_template_functionnality(section2);

  var subtitle = dv2.append('p').attr('class', 'params_section2').style('margin-top', '2px');
  subtitle.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.subtitle1' }).html(i18next.t('app_page.func_options.flow.subtitle1'));

  var origin_section = dv2.append('p').attr('class', 'params_section2');
  origin_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.origin_field' }).html(i18next.t('app_page.func_options.flow.origin_field'));
  origin_section.insert('select').attrs({ id: 'FlowMap_field_i', class: 'params' });

  var destination_section = dv2.append('p').attr('class', 'params_section2');
  destination_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.destination_field' }).html(i18next.t('app_page.func_options.flow.destination_field'));
  destination_section.append('select').attrs({ class: 'params', id: 'FlowMap_field_j' });

  var intensity_section = dv2.append('p').attr('class', 'params_section2');
  intensity_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.intensity_field' }).html(i18next.t('app_page.func_options.flow.intensity_field'));
  intensity_section.append('select').attrs({ class: 'params', id: 'FlowMap_field_fij' });

  var discretization_section = dv2.append('p').attr('class', 'params_section2');
  discretization_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.discretization' }).html(i18next.t('app_page.func_options.flow.discretization'));
  var disc_type = discretization_section.insert('select').attrs({ class: 'params i18n', id: 'FlowMap_discKind' });

  [['app_page.common.equal_interval', 'equal_interval'], ['app_page.common.quantiles', 'quantiles'], ['app_page.common.Q6', 'Q6'], ['app_page.common.arithmetic_progression', 'arithmetic_progression'], ['app_page.common.jenks', 'jenks']].forEach(function (field) {
    disc_type.append('option').text(i18next.t(field[0])).attrs({ value: field[1], 'data-i18n': '[text]' + field[0] });
  });

  var nb_class_section = dv2.append('p').attr('class', 'params_section2');
  nb_class_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.nb_class' }).html(i18next.t('app_page.func_options.flow.nb_class'));
  nb_class_section.insert('input').attrs({ type: 'number', class: 'params', id: 'FlowMap_nbClass', min: 1, max: 33, value: 8 }).style('width', '50px');

  dv2.append('p').attrs({ class: 'params', id: 'FlowMap_discTable' });
  dv2.append('p').attr('class', 'params_section2').insert('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.ref_layer_field' }).html(i18next.t('app_page.func_options.flow.ref_layer_field'));

  var join_field_section = dv2.append('p').attr('class', 'params_section2');
  join_field_section.append('span').attrs({ class: 'i18n', 'data-i18n': '[html]app_page.func_options.flow.join_field' }).html(i18next.t('app_page.func_options.flow.join_field'));
  join_field_section.insert('select').attrs({ class: 'params', id: 'FlowMap_field_join' });

  make_layer_name_button(dv2, 'FlowMap_output_name');
  make_ok_button(dv2, 'FlowMap_yes', false);

  d3.selectAll('.params').attr('disabled', true);
}

var fields_FlowMap = {
  fill: function fill(layer) {
    var self = this,
        field_i = section2.select('#FlowMap_field_i'),
        field_j = section2.select('#FlowMap_field_j'),
        field_fij = section2.select('#FlowMap_field_fij'),
        join_field = section2.select('#FlowMap_field_join'),
        nb_class_input = section2.select('#FlowMap_nbClass'),
        disc_type = section2.select('#FlowMap_discKind'),
        ok_button = section2.select('#FlowMap_yes'),
        uo_layer_name = section2.select('#FlowMap_output_name');

    if (joined_dataset.length > 0 && document.getElementById('FlowMap_field_i').options.length === 0) {
      var fields = Object.getOwnPropertyNames(joined_dataset[0][0]);
      fields.forEach(function (field) {
        field_i.append('option').text(field).attr('value', field);
        field_j.append('option').text(field).attr('value', field);
        field_fij.append('option').text(field).attr('value', field);
      });
    }
    if (layer) {
      var ref_fields = Object.getOwnPropertyNames(user_data[layer][0]);
      ref_fields.forEach(function (field) {
        join_field.append('option').text(field).attr('value', field);
      });
    }
    if (layer || joined_dataset.length > 0) {
      section2.selectAll('.params').attr('disabled', null);
      uo_layer_name.attr('value', ['Links', layer].join('_'));
    }
    var values_fij = void 0;

    field_fij.on('change', function () {
      var name = this.value,
          nclass = nb_class_input.node().value,
          disc = disc_type.node().value,
          min_size = 0.5,
          max_size = 10;
      values_fij = joined_dataset[0].map(function (obj) {
        return +obj[name];
      });
      make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
    });

    disc_type.on('change', function () {
      var name = field_fij.node().value,
          disc = this.value,
          min_size = 0.5,
          max_size = 10;
      var nclass = nb_class_input.node().value;
      if (disc === 'Q6') {
        nclass = 6;
        nb_class_input.attr('value', 6);
      }
      make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
    });

    nb_class_input.on('change', function () {
      var name = field_fij.node().value,
          nclass = this.value,
          disc = disc_type.node().value,
          min_size = 0.5,
          max_size = 10;
      make_min_max_tableau(values_fij, nclass, disc, min_size, max_size, 'FlowMap_discTable');
    });

    ok_button.on('click', function () {
      render_FlowMap(field_i.node().value, field_j.node().value, field_fij.node().value, join_field.node().value, disc_type.node().value, uo_layer_name.node().value);
    });
  },

  unfill: function unfill() {
    // const field_i = document.getElementById('FlowMap_field_i'),
    //   field_j = document.getElementById('FlowMap_field_j'),
    //   field_fij = document.getElementById('FlowMap_field_fij'),
    //   join_field = document.getElementById('FlowMap_field_join');
    //
    // for (let i = field_i.childElementCount - 1; i > -1; --i) {
    //   field_i.removeChild(field_i.children[i]);
    //   field_j.removeChild(field_j.children[i]);
    //   field_fij.removeChild(field_fij.children[i]);
    // }
    // unfillSelectInput(join_field);
    unfillSelectInput(document.getElementById('FlowMap_field_i'));
    unfillSelectInput(document.getElementById('FlowMap_field_j'));
    unfillSelectInput(document.getElementById('FlowMap_field_fij'));
    unfillSelectInput(document.getElementById('FlowMap_field_join'));
    document.getElementById('FlowMap_discTable').innerHTML = '';
    document.getElementById('FlowMap_output_name').value = '';
    section2.selectAll('.params').attr('disabled', true);
  }
};

function render_FlowMap(field_i, field_j, field_fij, name_join_field, disc_type, new_user_layer_name) {
  var ref_layer = Object.getOwnPropertyNames(user_data)[0],
      formToSend = new FormData(),
      join_field_to_send = {};

  var disc_params = fetch_min_max_table_value('FlowMap_discTable'),
      mins = disc_params.mins,
      maxs = disc_params.maxs,
      sizes = disc_params.sizes,
      nb_class = mins.length,
      user_breaks = [].concat(mins, maxs[nb_class - 1]),
      min_size = min_fast(sizes),
      max_size = max_fast(sizes);

  join_field_to_send[name_join_field] = user_data[ref_layer].map(function (obj) {
    return obj[name_join_field];
  });

  formToSend.append('json', JSON.stringify({
    topojson: current_layers[ref_layer].key_name,
    csv_table: JSON.stringify(joined_dataset[0]),
    field_i: field_i,
    field_j: field_j,
    field_fij: field_fij,
    join_field: join_field_to_send
  }));

  xhrequest('POST', 'compute/links', formToSend, true).then(function (data) {
    var options = { result_layer_on_add: true, func_name: 'flow' };
    if (new_user_layer_name.length > 0 && /^\w+$/.test(new_user_layer_name)) {
      options.choosed_name = new_user_layer_name;
    }

    var new_layer_name = add_layer_topojson(data, options);
    if (!new_layer_name) return;
    var layer_to_render = map.select('#' + _app.layer_to_id.get(new_layer_name)).selectAll('path'),
        fij_field_name = field_fij,
        fij_values = result_data[new_layer_name].map(function (obj) {
      return +obj[fij_field_name];
    }),
        nb_ft = fij_values.length,
        serie = new geostats(fij_values); // eslint-disable-line new-cap

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

    var links_byId = current_layers[new_layer_name].linksbyId;

    for (var i = 0; i < nb_ft; ++i) {
      var val = +fij_values[i];
      links_byId.push([i, val, sizes[serie.getClass(val)]]);
    }
    for (var _i8 = 0; _i8 < nb_class; ++_i8) {
      current_layers[new_layer_name].breaks.push([[user_breaks[_i8], user_breaks[_i8 + 1]], sizes[_i8]]);
    }
    layer_to_render.style('fill-opacity', 0).style('stroke-opacity', 0.8).style('stroke-width', function (d, i) {
      return links_byId[i][2];
    });
    switch_accordion_section();
    handle_legend(new_layer_name);
  }, function (error) {
    display_error_during_computation();
    console.log(error);
  });
}

var render_label = function render_label(layer, rendering_params, options) {
  var label_field = rendering_params.label_field;
  var txt_color = rendering_params.color;
  var selected_font = rendering_params.font;
  var font_size = rendering_params.ref_font_size + 'px';
  var new_layer_data = [];
  var layer_to_add = rendering_params.uo_layer_name && rendering_params.uo_layer_name.length > 0 ? check_layer_name(rendering_params.uo_layer_name) : check_layer_name('Labels_' + layer);
  var layer_id = encodeId(layer_to_add);
  var pt_position = void 0;
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  var nb_ft = void 0;
  if (options && options.current_position) {
    pt_position = options.current_position;
  }
  if (options && options.data) {
    new_layer_data = options.data;
    nb_ft = new_layer_data.length;
  } else if (layer) {
    var type_ft_ref = current_layers[layer].symbol || 'path';
    var ref_selection = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName(type_ft_ref);

    nb_ft = ref_selection.length;
    for (var i = 0; i < nb_ft; i++) {
      var ft = ref_selection[i].__data__;
      var coords = void 0;
      if (ft.geometry.type.indexOf('Multi') === -1) {
        coords = d3.geoCentroid(ft.geometry);
      } else {
        var areas = [];
        for (var j = 0; j < ft.geometry.coordinates.length; j++) {
          areas.push(path.area({
            type: ft.geometry.type,
            coordinates: [ft.geometry.coordinates[j]]
          }));
        }
        var ix_max = areas.indexOf(max_fast(areas));
        coords = d3.geoCentroid({
          type: ft.geometry.type, coordinates: [ft.geometry.coordinates[ix_max]] });
      }

      new_layer_data.push({
        id: i,
        type: 'Feature',
        properties: { label: ft.properties[label_field], x: coords[0], y: coords[1] },
        geometry: { type: 'Point', coordinates: coords }
      });
    }
  }
  var context_menu = new ContextMenu();
  var getItems = function getItems(self_parent) {
    return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
        make_style_box_indiv_label(self_parent);
      } }, { name: i18next.t('app_page.common.delete'), action: function action() {
        self_parent.style.display = 'none';
      } }];
  };

  var selection = map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer no_clip' }).selectAll('text').data(new_layer_data).enter().insert('text');
  if (pt_position) {
    selection.attrs(function (d, i) {
      return {
        id: 'Feature_' + i,
        x: pt_position[i][0],
        y: pt_position[i][1],
        'alignment-baseline': 'middle',
        'text-anchor': 'middle' };
    }).styles(function (d, i) {
      return {
        display: pt_position[i][2],
        'font-size': pt_position[i][3],
        'font-family': pt_position[i][4],
        fill: pt_position[i][5] };
    }).text(function (_, i) {
      return pt_position[i][6];
    });
  } else {
    selection.attrs(function (d, i) {
      var pt = path.centroid(d.geometry);
      return {
        id: 'Feature_' + i,
        x: pt[0],
        y: pt[1],
        'alignment-baseline': 'middle',
        'text-anchor': 'middle'
      };
    }).styles({ 'font-size': font_size, 'font-family': selected_font, fill: txt_color }).text(function (d) {
      return d.properties.label;
    });
  }

  selection.on('mouseover', function () {
    this.style.cursor = 'pointer';
  }).on('mouseout', function () {
    this.style.cursor = 'initial';
  }).on('dblclick contextmenu', function () {
    context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
  }).call(drag_elem_geo);

  create_li_layer_elem(layer_to_add, nb_ft, ['Point', 'label'], 'result');
  current_layers[layer_to_add] = {
    n_features: new_layer_data.length,
    renderer: 'Label',
    symbol: 'text',
    fill_color: txt_color,
    rendered_field: label_field,
    is_result: true,
    ref_layer_name: layer,
    default_size: font_size,
    default_font: selected_font
  };
  zoom_without_redraw();
  return layer_to_add;
};

var render_label_graticule = function render_label_graticule(layer, rendering_params, options) {
  var txt_color = rendering_params.color;
  var selected_font = rendering_params.font;
  var font_size = rendering_params.ref_font_size + 'px';
  var position_lat = rendering_params.position_lat || 'bottom';
  var position_lon = rendering_params.position_lon || 'left';
  var new_layer_data = [];
  var layer_to_add = check_layer_name('Labels_Graticule');
  var layer_id = encodeId(layer_to_add);
  _app.layer_to_id.set(layer_to_add, layer_id);
  _app.id_to_layer.set(layer_id, layer_to_add);
  var nb_ft = void 0;
  if (options && options.data) {
    new_layer_data = options.data;
    nb_ft = new_layer_data.length;
  } else if (layer) {
    var grat = d3.geoGraticule().step([current_layers.Graticule.step, current_layers.Graticule.step]);
    grat = current_layers.Graticule.extent ? grat.extent(current_layers.Graticule.extent).lines() : grat.lines();
    nb_ft = grat.length;
    for (var i = 0; i < nb_ft; i++) {
      var line = grat[i];
      var txt = void 0;
      var geometry = void 0;
      if (line.coordinates[0][0] === line.coordinates[1][0]) {
        txt = line.coordinates[0][0];
        geometry = position_lat === 'bottom' ? { type: 'Point', coordinates: line.coordinates[0] } : { type: 'Point', coordinates: line.coordinates[line.length - 1] };
      } else if (line.coordinates[0][1] === line.coordinates[1][1]) {
        txt = line.coordinates[0][1];
        geometry = position_lon === 'left' ? { type: 'Point', coordinates: line.coordinates[0] } : { type: 'Point', coordinates: line.coordinates[line.length - 1] };
      }
      if (txt !== undefined) {
        new_layer_data.push({
          id: i,
          type: 'Feature',
          properties: { label: txt },
          geometry: geometry
        });
      }
    }
  }
  var context_menu = new ContextMenu();
  var getItems = function getItems(self_parent) {
    return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
        make_style_box_indiv_label(self_parent);
      } }, { name: i18next.t('app_page.common.delete'), action: function action() {
        self_parent.style.display = 'none';
      } }];
  };

  map.insert('g', '.legend').attrs({ id: layer_id, class: 'layer no_clip' }).selectAll('text').data(new_layer_data).enter().insert('text').attrs(function (d, i) {
    var pt = path.centroid(d.geometry);
    return {
      id: 'Feature_' + i,
      x: pt[0],
      y: pt[1],
      'alignment-baseline': 'middle',
      'text-anchor': 'middle'
    };
  }).styles({ 'font-size': font_size, 'font-family': selected_font, fill: txt_color }).text(function (d) {
    return d.properties.label;
  }).on('mouseover', function () {
    this.style.cursor = 'pointer';
  }).on('mouseout', function () {
    this.style.cursor = 'initial';
  }).on('dblclick contextmenu', function () {
    context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
  }).call(drag_elem_geo);
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
};
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var drag_elem_geo = d3.drag().subject(function () {
  var t = d3.select(this);
  return {
    x: t.attr('x'),
    y: t.attr('y'),
    map_locked: !!map_div.select('#hand_button').classed('locked')
  };
}).on('start', function () {
  d3.event.sourceEvent.stopPropagation();
  d3.event.sourceEvent.preventDefault();
  handle_click_hand('lock');
}).on('end', function () {
  if (d3.event.subject && !d3.event.subject.map_locked) {
    handle_click_hand('unlock');
  }
}).on('drag', function () {
  d3.select(this).attr('x', d3.event.x).attr('y', d3.event.y);
});

var drag_elem_geo2 = d3.drag().filter(function () {
  return current_layers[_app.id_to_layer.get(this.parentElement.id)].draggable;
}).subject(function () {
  // const layer_name = _app.id_to_layer.get(this.parentElement.id);
  var symbol = current_layers[_app.id_to_layer.get(this.parentElement.id)].symbol;
  var t = d3.select(this);
  if (symbol === 'rect') {
    return {
      x: t.attr('x'),
      y: t.attr('y'),
      symbol: symbol,
      map_locked: !!map_div.select('#hand_button').classed('locked')
    };
  } else if (symbol === 'circle') {
    return {
      x: t.attr('cx'),
      y: t.attr('cy'),
      symbol: symbol,
      map_locked: !!map_div.select('#hand_button').classed('locked')
    };
  }
}).on('start', function () {
  d3.event.sourceEvent.stopPropagation();
  d3.event.sourceEvent.preventDefault();
  handle_click_hand('lock');
  var zoom = svg_map.__zoom;
  var centroid = path.centroid(this.__data__.geometry);
  centroid[0] = centroid[0] * zoom.k + zoom.x;
  centroid[1] = centroid[1] * zoom.k + zoom.y;
  map.append('rect').attrs({ x: centroid[0] - 2, y: centroid[1] - 2, height: 4, width: 4, id: 'ref_symbol_location' }).style('fill', 'red');
}).on('end', function () {
  if (d3.event.subject && !d3.event.subject.map_locked) {
    handle_click_hand('unlock');
  }
  map.selectAll('#ref_symbol_location').remove();
}).on('drag', function () {
  if (d3.event.subject.symbol === 'rect') {
    d3.select(this).attr('x', d3.event.x).attr('y', d3.event.y);
  } else if (d3.event.subject.symbol === 'circle') {
    d3.select(this).attr('cx', d3.event.x).attr('cy', d3.event.y);
  }
});

var drag_waffle = d3.drag().filter(function () {
  return current_layers[_app.id_to_layer.get(this.parentElement.id)].draggable;
}).subject(function () {
  var t = d3.select(this);
  var prev_translate = t.attr('transform');
  prev_translate = prev_translate ? prev_translate.slice(10, -1).split(',').map(function (f) {
    return +f;
  }) : [0, 0];
  return {
    x: t.attr('x') + prev_translate[0],
    y: t.attr('y') + prev_translate[1],
    map_locked: !!map_div.select('#hand_button').classed('locked')
  };
}).on('start', function () {
  d3.event.sourceEvent.stopPropagation();
  d3.event.sourceEvent.preventDefault();
  handle_click_hand('lock');
}).on('end', function () {
  if (d3.event.subject && !d3.event.subject.map_locked) {
    handle_click_hand('unlock');
  }
  d3.select(this).style('cursor', 'grab');
}).on('drag', function () {
  d3.select(this).attr('transform', 'translate(' + [d3.event.x, d3.event.y] + ')').style('cursor', 'grabbing');
});

function setSelected(selectNode, value) {
  selectNode.value = value; // eslint-disable-line no-param-reassign
  selectNode.dispatchEvent(new Event('change'));
}

// Function to be called after clicking on "render" in order to close the section 2
// and to have the section 3 opened
function switch_accordion_section(id_elem) {
  document.getElementById(id_elem || 'btn_s3').dispatchEvent(new MouseEvent('click'));
}

function check_remove_existing_box(box_selector) {
  var existing_box = document.querySelector(box_selector);
  if (existing_box) existing_box.remove();
}

function path_to_geojson(layerName) {
  var id_layer = ['#', _app.layer_to_id.get(layerName)].join('');
  var result_geojson = [];
  d3.select(id_layer).selectAll('path').each(function (d, i) {
    result_geojson.push({
      type: 'Feature',
      id: i,
      properties: d.properties,
      geometry: { type: d.type, coordinates: d.coordinates }
    });
  });
  return JSON.stringify({
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: result_geojson
  });
}

function display_error_during_computation(msg) {
  var message = message ? '<br><i>' + i18next.t('app_page.common.details') + ':</i> ' + msg : '';
  swal({
    title: i18next.t('app_page.common.error') + '!',
    text: '' + i18next.t('app_page.common.error_message') + msg,
    customClass: 'swal2_custom',
    type: 'error',
    allowOutsideClick: false
  });
}

/**
* Perform an asynchronous request
*
* @param {String} method - the method like "GET" or "POST"
* @param {String} url - the targeted url
* @param {FormData} data - Optionnal, the data to be send
* @return {Promise} response
*/
function request_data(method, url, data) {
  return new Promise(function (resolve, reject) {
    var request = new XMLHttpRequest();
    request.open(method, url, true);
    request.onload = resolve;
    request.onerror = reject;
    request.send(data);
  });
}

/**
* Perform an asynchronous request
*
* @param {String} method - the method like "GET" or "POST"
* @param {String} url - the targeted url
* @param {FormData} data - Optionnal, the data to be send
* @param {Boolean} waitingMessage - Optionnal, whether to display or not
* a waiting message while the request is proceeded
* @return {Promise} response
*/
function xhrequest(method, url, data, waitingMessage) {
  if (waitingMessage) {
    document.getElementById('overlay').style.display = '';
  }
  return new Promise(function (resolve, reject) {
    var request = new XMLHttpRequest();
    _app.xhr_to_cancel = request;
    request.open(method, url, true);
    request.onload = function (resp) {
      resolve(resp.target.responseText);
      _app.xhr_to_cancel = undefined;
      if (waitingMessage) {
        document.getElementById('overlay').style.display = 'none';
      }
    };
    request.onerror = function (err) {
      reject(err);
      _app.xhr_to_cancel = undefined;
      if (waitingMessage) {
        document.getElementById('overlay').style.display = 'none';
      }
    };
    request.send(data);
  });
}

function getImgDataUrl(url) {
  return new Promise(function (resolve, reject) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      var reader = new FileReader();
      reader.onloadend = function () {
        resolve(reader.result);
      };
      reader.readAsDataURL(request.response);
    };
    request.onerror = function (err) {
      reject(err);
    };
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.send();
  });
}

function make_content_summary(serie) {
  var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 6;

  return [i18next.t('app_page.stat_summary.population'), ' : ', round_value(serie.pop(), precision), '<br>', i18next.t('app_page.stat_summary.min'), ' : ', round_value(serie.min(), precision), ' | ', i18next.t('app_page.stat_summary.max'), ' : ', round_value(serie.max(), precision), '<br>', i18next.t('app_page.stat_summary.mean'), ' : ', round_value(serie.mean(), precision), '<br>', i18next.t('app_page.stat_summary.median'), ' : ', round_value(serie.median(), precision), '<br>', i18next.t('app_page.stat_summary.variance'), ' : ', round_value(serie.variance(), precision), '<br>', i18next.t('app_page.stat_summary.stddev'), ' : ', round_value(serie.stddev(), precision), '<br>', i18next.t('app_page.stat_summary.cov'), ' : ', round_value(serie.cov(), precision)].join('');
}

function copy_layer(ref_layer, new_name, type_result, fields_to_copy) {
  var id_new_layer = encodeId(new_name);
  var id_ref_layer = _app.layer_to_id.get(ref_layer);
  var node_ref_layer = svg_map.querySelector('#' + id_ref_layer);
  _app.layer_to_id.set(new_name, id_new_layer);
  _app.id_to_layer.set(id_new_layer, new_name);
  svg_map.appendChild(node_ref_layer.cloneNode(true));
  svg_map.lastChild.setAttribute('id', id_new_layer);
  var node_new_layer = document.getElementById(id_new_layer);
  svg_map.insertBefore(node_new_layer, svg_map.querySelector('.legend'));
  result_data[new_name] = [];
  current_layers[new_name] = {
    n_features: current_layers[ref_layer].n_features,
    type: current_layers[ref_layer].type,
    ref_layer_name: ref_layer
  };
  if (current_layers[ref_layer].pointRadius) {
    current_layers[new_name].pointRadius = current_layers[ref_layer].pointRadius;
  }
  var selec_src = node_ref_layer.getElementsByTagName('path'),
      selec_dest = node_new_layer.getElementsByTagName('path');
  if (!fields_to_copy) {
    for (var i = 0; i < selec_src.length; i++) {
      selec_dest[i].__data__ = selec_src[i].__data__;
      result_data[new_name].push(selec_dest[i].__data__.properties);
    }
  } else {
    for (var _i = 0; _i < selec_src.length; _i++) {
      selec_dest[_i].__data__ = { type: 'Feature', properties: {}, geometry: cloneObj(selec_src[_i].__data__.geometry) };
      var nb_field_to_copy = fields_to_copy.length;
      for (var j = 0; j < nb_field_to_copy; j++) {
        var f = fields_to_copy[j];
        selec_dest[_i].__data__.properties[f] = selec_src[_i].__data__.properties[f];
      }
      result_data[new_name].push(selec_dest[_i].__data__.properties);
    }
  }
  // Set the desired class name :
  node_new_layer.classList = ['layer'];
  // Reset visibility and filter attributes to default values:
  node_new_layer.style.visibility = '';
  node_new_layer.removeAttribute('filter');
  // Create an entry in the layer manager:
  create_li_layer_elem(new_name, current_layers[new_name].n_features, [current_layers[new_name].type, type_result], 'result');
}

/**
* Send a geo result layer computed client-side (currently only discontinuities)
* to the server in order to use it as other result layers computed server side
* @param {string} layerName - The name of the layer to send
* @param {string} url - The url to use
* @return {undefined}
*/
function send_layer_server(layerName, url) {
  var JSON_layer = path_to_geojson(layerName);
  var formToSend = new FormData();
  formToSend.append('geojson', JSON_layer);
  formToSend.append('layer_name', layerName);
  xhrequest('POST', url, formToSend, false).then(function (e) {
    current_layers[layerName].key_name = JSON.parse(e).key;
  }).catch(function (err) {
    display_error_during_computation();
    console.log(err);
  });
}

/**
* Function returning the name of all current layers (excepted the sample layers used as layout)
*
* @return {Array} - The name of the other layers in an Array
*/
function get_other_layer_names() {
  var otherLayers = Object.getOwnPropertyNames(current_layers);
  var tmpIdx = null;

  tmpIdx = otherLayers.indexOf('Graticule');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  tmpIdx = otherLayers.indexOf('World');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  tmpIdx = otherLayers.indexOf('Sphere');
  if (tmpIdx > -1) otherLayers.splice(tmpIdx, 1);

  return otherLayers;
}

/**
* Function triggered in order to add a new layer
* in the "layer manager" (with appropriates icons regarding to its type, etc.)
* @param {string} layerName - The name of the new layer
* @param {integer} nbFt - The number of feature in this layer
* @param {string} typeGeom - The geometry type
* @param {string} typeLayer - Whether it is a result layer or not
* @return {undefined}
*/
function create_li_layer_elem(layerName, nbFt, typeGeom, typeLayer) {
  var listDisplayName = get_display_name_on_layer_list(layerName);
  var layerId = encodeId(layerName);
  var layersListed = layer_list.node();
  var li = document.createElement('li');

  li.setAttribute('layer_name', layerName);
  if (typeLayer === 'result') {
    li.setAttribute('class', ['sortable_result ', layerId].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layerName, "</b> - ", typeGeom[0] ," - ", nbFt, " features"].join(''));
    li.innerHTML = [listDisplayName, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_legend, button_result_type.get(typeGeom[1]), '</div> '].join('');
  } else if (typeLayer === 'sample') {
    li.setAttribute('class', ['sortable ', layerId].join(''));
    // li.setAttribute("layer-tooltip",
    //         ["<b>", layerName, "</b> - Sample layout layer"].join(''));
    li.innerHTML = [listDisplayName, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_type.get(typeGeom), '</div> '].join('');
  }
  layersListed.insertBefore(li, layersListed.childNodes[0]);
  binds_layers_buttons(layerName);
}

/**
* Function returning an object describing the type of field
* @param {string} layerName - The name of the new layer
* @param {string} target - The geometry type
* @return {object|array} - An object containing the type of each field if
* target was nos specified, otherwise an array of field name corresponding
* to the type defined in 'target'.
*/
var type_col = function type_col(layerName, target) {
  // Function returning an object like {"field1": "field_type", "field2": "field_type"},
  //  for the fields of the selected layer.
  // If target is set to "number" it should return an array containing only the name of the numerical fields
  // ------------------- "string" ---------------------------------------------------------non-numerial ----
  var table = user_data.hasOwnProperty(layerName) ? user_data[layerName] : result_data.hasOwnProperty(layerName) ? result_data[layerName] : joined_dataset[0];
  var fields = Object.getOwnPropertyNames(table[0]);
  var nbFeatures = table.length;
  var deepthTest = nbFeatures > 100 ? 100 : nbFeatures - 1;
  var result = {};
  var field = void 0;
  var tmpType = void 0;

  for (var j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    result[field] = [];
    for (var i = 0; i < deepthTest; ++i) {
      tmpType = _typeof(table[i][field]);
      if (tmpType === 'string' && table[i][field].length === 0) {
        tmpType = 'empty';
      } else if (tmpType === 'string' && !isNaN(Number(table[i][field]))) {
        tmpType = 'number';
      } else if (tmpType === 'object' && isFinite(table[i][field])) {
        tmpType = 'empty';
      }
      result[fields[j]].push(tmpType);
    }
  }

  for (var _j = 0, _len = fields.length; _j < _len; ++_j) {
    field = fields[_j];
    if (result[field].every(function (ft) {
      return ft === 'number' || ft === 'empty';
    }) && result[field].indexOf('number') > -1) {
      result[field] = 'number';
    } else {
      result[field] = 'string';
    }
  }
  if (target) {
    var res = [];
    Object.keys(result).forEach(function (k) {
      if (result[k] === target && k !== '_uid') {
        res.push(k);
      }
    });
    return res;
  }
  return result;
};

var type_col2 = function type_col2(table, _field) {
  var skip_if_empty_values = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  // Function returning an object like {"field1": "field_type", "field2": "field_type"},
  //  for the fields of the selected layer.
  var result = [];
  var nbFeatures = table.length;
  var tmp = {};
  var dups = {};
  var field = _field;
  var tmpType = void 0;
  var fields = void 0;

  if (!field) {
    fields = Object.getOwnPropertyNames(table[0]).filter(function (v) {
      return v !== '_uid';
    });
    field = undefined;
  } else {
    fields = [field];
    field = undefined;
  }

  for (var j = 0, len = fields.length; j < len; ++j) {
    field = fields[j];
    tmp[field] = [];
    dups[field] = false;
    var h = {};
    for (var i = 0; i < nbFeatures; ++i) {
      var val = table[i][field];
      if (h[val]) dups[field] = true;else h[val] = true;
      tmpType = typeof val === 'undefined' ? 'undefined' : _typeof(val);
      if (tmpType === 'object' && isFinite(val)) {
        tmpType = 'empty';
      } else if (tmpType === 'string' && val.length === 0) {
        tmpType = 'empty';
      } else if (tmpType === 'string' && !isNaN(Number(val)) || tmpType === 'number') {
        var _val = Number(table[i][field]);
        tmpType = (_val | 0) === val ? 'stock' : 'ratio';
      }
      tmp[fields[j]].push(tmpType);
    }
  }
  for (var _j2 = 0, _len2 = fields.length; _j2 < _len2; ++_j2) {
    field = fields[_j2];
    var hasDup = dups[field];
    if (field.toLowerCase() === 'id' && !hasDup) {
      result.push({ name: field, type: 'id', has_duplicate: hasDup });
    } else if (tmp[field].every(function (ft) {
      return ft === 'stock' || ft === 'empty';
    }) && tmp[field].indexOf('stock') > -1) {
      result.push({ name: field, type: 'stock', has_duplicate: hasDup });
    } else if (tmp[field].every(function (ft) {
      return ft === 'string' || ft === 'empty';
    }) && tmp[field].indexOf('string') > -1) {
      result.push({ name: field, type: 'category', has_duplicate: hasDup });
    } else if (tmp[field].every(function (ft) {
      return ft === 'ratio' || ft === 'stock' || ft === 'empty';
    }) && tmp[field].indexOf('ratio') > -1) {
      result.push({ name: field, type: 'ratio' });
    } else {
      result.push({ name: field, type: 'unknown', has_duplicate: hasDup });
    }
  }
  return result;
};

var getFieldsType = function getFieldsType(type, layerName, ref) {
  if (!layerName && !ref) return null;
  var refField = ref || current_layers[layerName].fields_type;
  return refField.filter(function (d) {
    return d.type === type;
  }).map(function (d) {
    return d.name;
  });
};

function make_box_type_fields(layerName) {
  make_dialog_container('box_type_fields', i18next.t('app_page.box_type_fields.title'), 'dialog');
  d3.select('#box_type_fields').select('modal-dialog').style('width', '400px');
  var newbox = d3.select('#box_type_fields').select('.modal-body');
  var tmp = type_col2(user_data[layerName]);
  var fields_type = current_layers[layerName].fields_type;
  var f = fields_type.map(function (v) {
    return v.name;
  });
  var refType = ['id', 'stock', 'ratio', 'category', 'unknown'];

  var deferred = Promise.pending();
  var container = document.getElementById('box_type_fields');

  var clean_up_box = function clean_up_box() {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', helper_esc_key_twbs);
  };

  if (f.length === 0) {
    // If the user dont have already selected the type :
    fields_type = tmp.slice();
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    var _onclose = function _onclose() {
      // Or use the default values if he use the X  close button
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('#xclose').onclick = _onclose;
  } else if (tmp.length > fields_type.length) {
    // There is already types selected but new fields where added
    tmp.forEach(function (d) {
      if (f.indexOf(d.name) === -1) {
        fields_type.push(d);
      }
    });
    container.querySelector('.btn_cancel').remove(); // Disabled cancel button to force the user to choose
    var _onclose2 = function _onclose2() {
      // Or use the default values if he use the X  close button
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('#xclose').onclick = _onclose2;
  } else {
    // There is already types selected and no new fields (so this is a modification) :
    // Use the previous values if the user close
    // the window without confirmation (cancel or X button)
    var _onclose3 = function _onclose3() {
      current_layers[layerName].fields_type = fields_type;
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('.btn_cancel').onclick = _onclose3;
    container.querySelector('#xclose').onclick = _onclose3;
  }

  // Fetch and store the selected values when 'Ok' button is clicked :
  container.querySelector('.btn_ok').onclick = function () {
    var r = [];
    Array.prototype.forEach.call(document.getElementById('fields_select').getElementsByTagName('p'), function (elem) {
      r.push({ name: elem.childNodes[0].innerHTML.trim(), type: elem.childNodes[1].value });
    });
    deferred.resolve(true);
    current_layers[layerName].fields_type = r.slice();
    getAvailablesFunctionnalities(layerName);
    if (window.fields_handler) {
      fields_handler.unfill();
      fields_handler.fill(layerName);
    }
    clean_up_box();
  };
  function helper_esc_key_twbs(_evt) {
    var evt = _evt || window.event;
    var isEscape = 'key' in evt ? evt.key === 'Escape' || evt.key === 'Esc' : evt.keyCode === 27;
    if (isEscape) {
      evt.stopPropagation();
      current_layers[layerName].fields_type = tmp.slice();
      getAvailablesFunctionnalities(layerName);
      deferred.resolve(false);
      clean_up_box();
    }
  }
  document.addEventListener('keydown', helper_esc_key_twbs);
  document.getElementById('btn_type_fields').removeAttribute('disabled');

  newbox.append('h3').html(i18next.t('app_page.box_type_fields.message_invite'));

  var box_select = newbox.append('div').attr('id', 'fields_select');

  box_select.selectAll('p').data(fields_type).enter().append('p').style('margin', '15px');

  box_select.selectAll('p').insert('span').html(function (d) {
    return d.name;
  });

  box_select.selectAll('p').insert('select').style('float', 'right').selectAll('option').data(refType).enter().insert('option').attr('value', function (d) {
    return d;
  }).text(function (d) {
    return i18next.t('app_page.box_type_fields.' + d);
  }).exit();

  box_select.selectAll('select').each(function (d) {
    this.value = d.type;
  });

  for (var i = 0; i < fields_type.length; i++) {
    if (fields_type[i].type === 'category' || fields_type[i].not_number) {
      box_select.node().childNodes[i].childNodes[1].options.remove(2);
      box_select.node().childNodes[i].childNodes[1].options.remove(1);
    }
    if (fields_type[i].has_duplicate) {
      box_select.node().childNodes[i].childNodes[1].options.remove(0);
    }
  }
  overlay_under_modal.display();
  setTimeout(function (_) {
    container.querySelector('button.btn_ok').focus();
  }, 400);
  return deferred.promise;
}

function getAvailablesFunctionnalities(layerName) {
  var fields_stock = getFieldsType('stock', layerName),
      fields_ratio = getFieldsType('ratio', layerName),
      fields_categ = getFieldsType('category', layerName),
      section = document.getElementById('section2_pre');
  var func_stock = void 0,
      func_ratio = void 0,
      func_categ = void 0;
  if (current_layers[layerName].type === 'Line') {
    // Layer type is Line
    var elems = section.querySelectorAll('#button_grid, #button_discont, #button_smooth, #button_cartogram, #button_typosymbol, #button_flow');
    for (var i = 0, len_i = elems.length; i < len_i; i++) {
      elems[i].style.filter = 'grayscale(100%)';
    }
    func_stock = section.querySelectorAll('#button_prop');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo');
  } else if (current_layers[layerName].type === 'Point') {
    // layer type is Point
    var _elems = section.querySelectorAll('#button_grid, #button_discont, #button_cartogram');
    for (var _i2 = 0, _len_i = _elems.length; _i2 < _len_i; _i2++) {
      _elems[_i2].style.filter = 'grayscale(100%)';
    }
    func_stock = section.querySelectorAll('#button_smooth, #button_prop');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
  } else {
    // Layer type is Polygon
    func_stock = section.querySelectorAll('#button_smooth, #button_prop, #button_grid, #button_cartogram, #button_discont');
    func_ratio = section.querySelectorAll('#button_choro, #button_choroprop, #button_discont');
    func_categ = section.querySelectorAll('#button_typo, #button_proptypo, #button_typosymbol');
  }
  if (fields_stock.length === 0) {
    Array.prototype.forEach.call(func_stock, function (d) {
      return d.style.filter = 'grayscale(100%)';
    });
  } else {
    Array.prototype.forEach.call(func_stock, function (d) {
      return d.style.filter = 'invert(0%) saturate(100%)';
    });
  }
  if (fields_ratio.length === 0) {
    Array.prototype.forEach.call(func_ratio, function (d) {
      return d.style.filter = 'grayscale(100%)';
    });
  } else {
    Array.prototype.forEach.call(func_ratio, function (d) {
      return d.style.filter = 'invert(0%) saturate(100%)';
    });
  }
  if (fields_categ.length === 0) {
    Array.prototype.forEach.call(func_categ, function (d) {
      return d.style.filter = 'grayscale(100%)';
    });
  } else {
    Array.prototype.forEach.call(func_categ, function (d) {
      return d.style.filter = 'invert(0%) saturate(100%)';
    });
  }
  if (fields_stock.length === 0 || fields_ratio.length === 0) {
    document.getElementById('button_choroprop').style.filter = 'grayscale(100%)';
  } else {
    document.getElementById('button_choroprop').style.filter = 'invert(0%) saturate(100%)';
  }
  if (fields_stock.length === 0 || fields_categ.length === 0) {
    document.getElementById('button_proptypo').style.filter = 'grayscale(100%)';
  } else {
    document.getElementById('button_proptypo').style.fiter = 'invert(0%) saturate(100%)';
  }
}

var clickLinkFromDataUrl = function clickLinkFromDataUrl(url, filename) {
  return fetch(url).then(function (res) {
    return res.blob();
  }).then(function (blob) {
    var blobUrl = URL.createObjectURL(blob);
    var dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', blobUrl);
    dlAnchorElem.setAttribute('download', filename);
    // if (window.isIE || window.isOldMS_Firefox) {
    if (window.isIE) {
      swal({
        title: '',
        html: '<div class="link_download"><p>' + i18next.t('app_page.common.download_link') + '</p></div>',
        showCancelButton: true,
        showConfirmButton: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
        cancelButtonText: i18next.t('app_page.common.close'),
        animation: 'slide-from-top',
        onOpen: function onOpen() {
          dlAnchorElem.innerHTML = filename;
          var content = document.getElementsByClassName('link_download')[0];
          content.appendChild(dlAnchorElem);
        },
        onClose: function onClose() {
          URL.revokeObjectURL(blobUrl);
        }
      }).then(function (inputValue) {
        return null;
      }, function (dismissValue) {
        return null;
      });
    } else {
      dlAnchorElem.style.display = 'none';
      document.body.appendChild(dlAnchorElem);
      dlAnchorElem.click();
      dlAnchorElem.remove();
      URL.revokeObjectURL(blobUrl);
    }
  });
};

var helper_esc_key_twbs_cb = function helper_esc_key_twbs_cb(_event, callback) {
  var evt = _event || window.event;
  var isEscape = 'key' in evt ? evt.key === 'Escape' || evt.key === 'Esc' : evt.keyCode === 27;
  if (isEscape) {
    evt.stopPropagation();
    if (callback) {
      callback();
    }
  }
};

var cloneObj = function cloneObj(obj) {
  if (obj === null || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') return obj;else if (obj.toString() === '[object Map]') return new Map(obj.entries());
  return Object.assign({}, obj);
};

function change_layer_name(old_name, new_name) {
  var old_id = _app.layer_to_id.get(old_name);
  var new_id = encodeId(new_name);
  current_layers[new_name] = cloneObj(current_layers[old_name]);
  delete current_layers[old_name];
  var list_elem = document.querySelector('li.' + old_id);
  list_elem.classList.remove(old_id);
  list_elem.classList.add(new_id);
  list_elem.setAttribute('layer_name', new_name);
  list_elem.innerHTML = list_elem.innerHTML.replace(old_name, new_name);
  var b = svg_map.querySelector('#' + old_id);
  b.id = new_id;
  var lgd_elem = document.querySelector('g[layer_name="' + old_name + '"]');
  if (lgd_elem) {
    lgd_elem.setAttribute('layer_name', new_name);
    lgd_elem.classList.remove('lgdf_' + old_id);
    lgd_elem.classList.add('lgdf_' + new_id);
  }
  if (Object.getOwnPropertyNames(result_data).indexOf(old_name) > -1) {
    result_data[new_name] = [].concat(result_data[old_name]);
    delete result_data[old_name];
  }
  if (Object.getOwnPropertyNames(user_data).indexOf(old_name) > -1) {
    user_data[new_name] = [].concat(user_data[old_name]);
    delete user_data[old_name];
  }
  if (current_layers[new_name].targeted) {
    var name_section1 = document.getElementById('section1').querySelector('#input_geom');
    name_section1.innerHTML = name_section1.innerHTML.replace(old_name, new_name);
    if (window.fields_handler) {
      window.fields_handler.unfill();
      window.fields_handler.fill(new_name);
    }
  }
  if (_app.current_functionnality && _app.current_functionnality.name === 'smooth') {
    var mask_layers = document.querySelectorAll('select#stewart_mask > option');
    for (var i = 0; i < mask_layers.length; i++) {
      if (mask_layers[i].value === old_name) {
        mask_layers[i].value = new_name;
        mask_layers[i].innerHTML = new_name;
      }
    }
  }
  var other_layers = Object.getOwnPropertyNames(current_layers);
  for (var _i3 = 0; _i3 < other_layers.length; _i3++) {
    if (current_layers[other_layers[_i3]].ref_layer_name === old_name) {
      current_layers[other_layers[_i3]].ref_layer_name = new_name;
    }
  }
  var select_export_lyr = document.getElementById('section5').querySelectorAll('#layer_to_export > option');
  for (var _i4 = 0; _i4 < select_export_lyr.length; _i4++) {
    if (select_export_lyr[_i4].value === old_name) {
      select_export_lyr[_i4].value = new_name;
      select_export_lyr[_i4].innerHTML = new_name;
    }
  }
  _app.layer_to_id.set(new_name, new_id);
  _app.id_to_layer.set(new_id, new_name);
  _app.layer_to_id.delete(old_name);
  _app.id_to_layer.delete(old_id);
  binds_layers_buttons(new_name);
}
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
* Function computing the min of an array of values (tking care of empty/null/undefined slot)
*  - no fancy functionnalities here (it doesn't add anything comparing to Math.min.apply()
*    or d3.min() except a little speed-up)
*
* @param {Array} arr - The serie of values.
* @return {Number} - The minimum value.
*/
function min_fast(arr) {
  var min = arr[0];
  for (var i = 1, len_i = arr.length; i < len_i; ++i) {
    var val = +arr[i];
    if (val && val < min) min = val;
  }
  return min;
}

/**
* Return the maximum value of an array of numbers
*
* @param {Array} arr - the array of numbers
* @return {Number} max
*/
function max_fast(arr) {
  var max = arr[0];
  for (var i = 1, len_i = arr.length; i < len_i; ++i) {
    var val = +arr[i];
    if (val > max) max = val;
  }
  return max;
}

/**
* Test an array of numbers for negative values
*
* @param {Array} arr - the array of numbers
* @return {Bool} result - True or False, whether it contains negatives values or not
*/
function has_negative(arr) {
  for (var i = 0; i < arr.length; ++i) {
    if (+arr[i] < 0) return true;
  }
  return false;
}

/**
* @param {Array} arr - The array to test
* @return {Boolean} result - True or False, according to whether it contains empty values or not
*/
var contains_empty_val = function contains_empty_val(arr) {
  for (var i = arr.length - 1; i > -1; --i) {
    if (arr[i] == null) return true;else if (isNaN(+arr[i])) return true;
  }
  return false;
};

/**
* @param {Array} arr - The array to test
* @return {Boolean} result - True or False, according to whether it contains duplicate or not
*/
function has_duplicate(arr) {
  var _h = {},
      len_arr = arr.length;
  for (var i = 0; i < len_arr; i++) {
    if (_h[arr[i]]) return true;
    _h[arr[i]] = true;
  }
  return false;
}

/**
* Round a given value with the given precision
*
* @param {Number} val - The value to be rounded.
* @param {Number} precision - The wanted precision.
* @return {Number} value - The rounded value.
*/
var round_value = function round_value(val, nb) {
  if (nb === undefined) {
    return val;
  }
  var dec_mult = +['1', Array(Math.abs(nb)).fill('0').join('')].join('');
  return nb >= 0 ? Math.round(+val * dec_mult) / dec_mult : Math.round(+val / dec_mult) * dec_mult;
};

function get_nb_decimals(nb) {
  var tmp = nb.toString().split('.');
  return tmp.length < 2 ? 0 : tmp[1].length;
}

function get_nb_left_separator(nb) {
  var tmp = nb.toString().split('.');
  return tmp[0].length;
}

/**
* Get the decimal separator in user's locale.
* and compute the number of item in each bin.
*
* @return {String} separator - The decimal separator (dot or comma)
*/
function getDecimalSeparator() {
  return 1.1.toLocaleString().substr(1, 1);
}

var get_precision_axis = function get_precision_axis(serie_min, serie_max, precision) {
  var range_serie = serie_max - serie_min;
  if (serie_max > 1 && range_serie > 100) {
    return '.0f';
  } else if (range_serie > 10) {
    if (precision === 0) {
      return '.0f';
    }
    return '.1f';
  } else if (range_serie > 1) {
    if (precision < 2) {
      return '.1f';
    }
    return '.2f';
  } else if (range_serie > 0.1) {
    return '.3f';
  } else if (range_serie > 0.01) {
    return '.4f';
  } else if (range_serie > 0.001) {
    return '.5f';
  } else if (range_serie > 0.0001) {
    return '.6f';
  } else if (range_serie > 0.00001) {
    return '.7f';
  }
  return '.8f';
};

var PropSizer = function PropSizer(fixed_value, fixed_size, type_symbol) {
  var _this = this;

  this.fixed_value = fixed_value;
  var sqrt = Math.sqrt,
      abs = Math.abs,
      pi = Math.PI;
  if (type_symbol === 'circle') {
    this.smax = fixed_size * fixed_size * pi;
    this.scale = function (val) {
      return sqrt(abs(val) * _this.smax / _this.fixed_value) / pi;
    };
    this.get_value = function (size) {
      return Math.pow(size * pi, 2) / _this.smax * _this.fixed_value;
    };
  } else if (type_symbol === 'line') {
    this.smax = fixed_size;
    this.scale = function (val) {
      return abs(val) * _this.smax / _this.fixed_value;
    };
    this.get_value = function (size) {
      return size / _this.smax * _this.fixed_value;
    };
  } else {
    this.smax = fixed_size * fixed_size;
    this.scale = function (val) {
      return sqrt(abs(val) * _this.smax / _this.fixed_value);
    };
    this.get_value = function (size) {
      return Math.pow(size, 2) / _this.smax * _this.fixed_value;
    };
  }
};

function prop_sizer3_e(arr, fixed_value, fixed_size, type_symbol) {
  var pi = Math.PI,
      abs = Math.abs,
      sqrt = Math.sqrt,
      arr_len = arr.length,
      res = [];

  if (!fixed_value || fixed_value === 0) {
    fixed_value = max_fast(arr);
  }

  if (type_symbol === 'circle') {
    var smax = fixed_size * fixed_size * pi;
    var _t = smax / fixed_value;
    for (var i = 0; i < arr_len; ++i) {
      res.push(sqrt(abs(arr[i]) * _t) / pi);
    }
  } else if (type_symbol === 'line') {
    var _t2 = fixed_size / fixed_value;
    for (var _i = 0; _i < arr_len; ++_i) {
      res.push(abs(arr[_i]) * _t2);
    }
  } else {
    var _smax = fixed_size * fixed_size;
    var _t3 = _smax / fixed_value;
    for (var _i2 = 0; _i2 < arr_len; ++_i2) {
      res.push(sqrt(abs(arr[_i2]) * _t3));
    }
  }
  return res;
}

/**
* Compute the "optimal" (cf. xxx) number of class according to the number
* of features in serie of values.
*
* @param {Integer} len_serie - The length of the serie of values.
* @return {Integer} - The "optimal" number of classes to be used to discretize the serie.
*/
function getOptNbClass(len_serie) {
  return Math.floor(1 + 3.3 * Math.log10(len_serie));
}

/**
* Compute breaks according to "Q6" method
* and compute the number of item in each bin.
*
* @param {Array} serie - An array of ordered values.
* @param {Number} precision - An integer value decribing the precision of the serie.
* @return {Object} - Object containing the breaks and the stock in each class.
*/
function getBreaksQ6(serie) {
  var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var len_serie = serie.length;
  var q6_class = [1, 0.05 * len_serie, 0.275 * len_serie, 0.5 * len_serie, 0.725 * len_serie, 0.95 * len_serie, len_serie];
  var breaks = [];
  var tmp = 0;
  var j = void 0;
  var stock_class = [];
  for (var i = 0; i < 7; ++i) {
    j = Math.round(q6_class[i]) - 1;
    breaks.push(+serie[j]);
    stock_class.push(j - tmp);
    tmp = j;
  }
  stock_class.shift();
  if (breaks[0] === breaks[1]) {
    // breaks[1] = breaks[0] + (breaks[2] - breaks[1]) / 2;
    breaks[1] = (+serie[1] + breaks[0]) / 2;
  }
  if (breaks[6] === breaks[5]) {
    breaks[5] = serie[len_serie - 2];
    // breaks[5] = breaks[4] + (breaks[5] - breaks[4]) / 2;
  }
  if (precision != null) {
    breaks = breaks.map(function (val) {
      return round_value(val, precision);
    });
  }
  return {
    breaks: breaks,
    stock_class: stock_class
  };
}

/**
* Compute breaks according to our "mean and standard deviation" method
* and compute the number of item in each bin.
*
* @param {Array} serie - An array of ordered values.
* @param {Number} share - The ratio of stddev to be used a size for each class.
* @param {String} mean_position - The position of the mean value.
* @param {Number} precision - An integer value decribing the precision of the serie.
* @return {Object} - Object containing the breaks and the stock in each class.
*/
function getBreaksStdDev(serie, share) {
  var mean_position = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'center';
  var precision = arguments[3];

  var min = serie.min(),
      max = serie.max(),
      mean = serie.mean(),
      std_dev = serie.stddev(),
      class_size = std_dev * share;
  var breaks = mean_position === 'center' ? [mean - class_size / 2, mean + class_size / 2] : [mean - class_size, mean, mean + class_size];

  var _precision = precision || serie.precision;

  while (breaks[0] > min) {
    breaks.unshift(breaks[0] - class_size);
  }
  while (breaks[breaks.length - 1] < max) {
    breaks.push(breaks[breaks.length - 1] + class_size);
  }
  var nb_class = breaks.length - 1;
  if (breaks[0] < min) {
    if (breaks[1] < min) {
      console.log('This shouldn\'t happen (min)');
    }
    breaks[0] = min;
  }

  if (breaks[nb_class] > max) {
    if (breaks[nb_class - 1] > max) {
      console.log('This shouldn\'t happen (max)');
    }
    breaks[nb_class] = max;
  }
  return {
    nb_class: nb_class,
    breaks: breaks.map(function (v) {
      return round_value(v, _precision);
    })
  };
}

/**
* Compute a summary about the given serie of values.
*
* @param {Array} _values - The serie of values.
* @param {Integer} bins - The number of bins to be used to compute the stock by class.
* @return {Object} - A summary containing the break values (according to the number
* of bins), the min value, the max value, the mean value, the median value,
* the standard deviation and the stock by class.
*
*/
function getBinsCount(_values) {
  var bins = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 16;

  var values = _values.filter(function (a) {
    return a;
  }).sort(function (a, b) {
    return a - b;
  });
  var nb_ft = values.length;
  var min = values[0],
      max = values[nb_ft - 1],
      extend = max - min,
      bin_size = extend / bins,
      counts = new Array(bins),
      break_values = [min],
      ix_med = (nb_ft + 1) / 2;
  var sum = 0;

  for (var i = 0; i < bins; i++) {
    break_values.push(break_values[i] + bin_size);
  }
  for (var _i3 = 1, j = 0; _i3 < nb_ft; _i3++) {
    var class_max = break_values[_i3 - 1];
    counts[_i3 - 1] = 0;
    while (values[j] <= class_max) {
      sum += values[j];
      counts[_i3 - 1] += 1;
      j += 1;
    }
  }
  var mean = sum / nb_ft;
  var stddev = getStdDev(values, mean);

  return {
    breaks: break_values,
    counts: counts,
    min: min,
    max: max,
    mean: mean,
    median: (ix_med | 0) === ix_med ? values[ix_med] : (values[Math.floor(ix_med)] + values[Math.ceil(ix_med)]) / 2,
    stddev: stddev
  };
}

/**
* Parse a string of comma separated break values
* to an actual Array of break values.
* The serie is used to defined if there may be negative values
* in the defined break values.
*
* @param {Array} serie - The serie of values to be discretised with `breaks_list`.
* @param {String} breaks_list - The user_defined break values as String.
* @return {Array} - The actual Array of break values.
*/
function parseUserDefinedBreaks(serie, breaks_list) {
  var separator = has_negative(serie) ? '- ' : '-';
  return breaks_list.split(separator).map(function (el) {
    return +el.trim();
  });
}

/**
* Returns the break values and the stock of each class given
* a list of breaks defined by the user.
*
* @param {Array} serie - The serie of values to be discretised
* @param {Array} breaks - The list of breaks, whether as a String (a typed by the user)
*                    or as an Array.
* @return {Object} - An Object with the stock (number of feature) in each class
*                    and the break values (should be unchanged if provided as an Array)
*/
function getBreaks_userDefined(serie, breaks) {
  var break_values = typeof breaks === 'string' ? parseUserDefinedBreaks(serie, breaks) : breaks;
  var len_serie = serie.length,
      len_break_val = break_values.length,
      stock_class = new Array(len_break_val - 1);
  var j = 0;
  for (var i = 1; i < len_break_val; ++i) {
    var class_max = break_values[i];
    stock_class[i - 1] = 0;
    while (serie[j] <= class_max) {
      stock_class[i - 1] += 1;
      j += 1;
    }
  }
  return {
    breaks: break_values,
    stock_class: stock_class
  };
}

/**
* Return the haversine distance in kilometers between two points (lat/long coordinates)
*
* @param {Array} A - Coordinates of the 1st point as [latitude, longitude]
* @param {Array} B - Coordinates of the 2nd point as [latitude, longitude]
* @return {Number} distance - The distance in km between A and B
*/
function haversine_dist(A, B) {
  var pi_dr = Math.PI / 180;

  var lat1 = +A[0],
      lon1 = +A[1],
      lat2 = +B[0],
      lon2 = +B[1];

  var x1 = lat2 - lat1,
      dLat = x1 * pi_dr,
      x2 = lon2 - lon1,
      dLon = x2 * pi_dr;

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * pi_dr) * Math.cos(lat2 * pi_dr) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
* Return the distance in kilometers between two points (lat/long coordinates)
* according to the spherical law of cosines
*
* @param {Array} A - Coordinates of the 1st point as [latitude, longitude]
* @param {Array} B - Coordinates of the 2nd point as [latitude, longitude]
* @return {Number} distance - The distance in km between A and B
*/
function coslaw_dist(A, B) {
  var pi_dr = Math.PI / 180;

  var lat1 = +A[0],
      lon1 = +A[1],
      lat2 = +B[0],
      lon2 = +B[1];
  var phi1 = lat1 * pi_dr,
      phi2 = lat2 * pi_dr,
      d_lambda = (lon2 - lon1) * pi_dr;
  return Math.acos(Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(d_lambda)) * 6371;
}

/**
* Compute the euclidian distance between pt1 and pt2, in the unit provided.
*
* @param {Array} pt1 - Coordinates of the 1st point as [x, y].
* @param {Array} pt2 - Coordinates of the 2nd point as [x, y].
* @return {Number} - The euclidian distance between pt1 and pt2.
*/
function get_distance(pt1, pt2) {
  var xs = pt2[0] - pt1[1];
  var ys = pt2[1] - pt1[1];
  return Math.sqrt(xs * xs + ys * ys);
}

/**
* Compute the standard deviation of a serie of values.
*
* @param {Array} values - The serie of values.
* @param {Number} mean_val - The mean of the serie (computed upstream).
* @return {Number} - The standard deviation.
*/
function getStdDev(values, mean_val) {
  var nb_val = values.length;
  // const pow = Math.pow;
  var s = 0;
  for (var i = 0; i < nb_val; i++) {
    // s += pow(values[i] - mean_val, 2);
    s += Math.pow(values[i] - mean_val, 2);
  }
  return Math.sqrt(1 / nb_val * s);
}

/**
* Return the maximal available rectangle in the map
*  in order to locate a new legend without covering existing ones.
*
* Implementation taken from http://www.codinghands.co.uk/blog/2013/02/javascript-implementation-omn-maximal-rectangle-algorithm/
*
* @param {NodeList} legend_nodes - All the existing `Node`s corresponding
                    to the main (ie. larger) element of a legend on the map.
* @return {Object} - A summary about the larger available rectangle found.
*
*/
function getMaximalAvailableRectangle(legend_nodes) {
  function getMaxRect() {
    var cache = new Array(rows + 1);
    var stack = [];
    var bestUpperLeft = { x: -1, y: -1 };
    var bestLowerRight = { x: -1, y: -1 };

    for (var i = 0; i < cache.length; i++) {
      cache[i] = 0;
    }

    for (var x = cols - 1; x >= 0; x--) {
      updateCache(x, cache);
      var width = 0;
      for (var y = 0; y < rows + 1; y++) {
        if (cache[y] > width) {
          stack.push({ y: y, width: width });
          width = cache[y];
        }
        if (cache[y] < width) {
          var _y = void 0;
          var w0 = void 0;
          while (true) {
            var pop = stack.pop();
            _y = pop.y;
            w0 = pop.width;
            if (width * (y - _y) > area(bestUpperLeft, bestLowerRight) && y - _y >= minQuadY && width >= minQuadX) {
              bestUpperLeft = { x: x, y: _y };
              bestLowerRight = { x: x + width - 1, y: y - 1 };
            }
            width = w0;
            if (cache[y] >= width) break;
          }
          width = cache[y];
          if (width !== 0) stack.push({ y: _y, width: w0 });
        }
      }
    }
    return {
      x: bestUpperLeft.x,
      y: bestUpperLeft.y,
      lenX: bestLowerRight.x - bestUpperLeft.x + 1,
      lenY: bestLowerRight.y - bestUpperLeft.y + 1,
      area: area(bestUpperLeft, bestLowerRight)
    };
  }

  function area(upperLeft, lowerRight) {
    if (upperLeft.x > lowerRight.x || upperLeft.y > lowerRight.y) return 0;
    return (lowerRight.x + 1 - upperLeft.x) * (lowerRight.y + 1 - upperLeft.y);
  }

  function updateCache(x, cache) {
    for (var y = 0; y < rows; y++) {
      if (mat[x][y] === 1) cache[y]++;else cache[y] = 0;
    }
  }

  function fillMat(xs, ys) {
    for (var x = xs[0]; x < xs[1]; x++) {
      for (var y = ys[0]; y < ys[1]; y++) {
        mat[x][y] = 0;
      }
    }
  }

  var _get_map_xy = get_map_xy0(),
      x0 = _get_map_xy.x,
      y0 = _get_map_xy.y;

  var minQuadY = 100;
  var minQuadX = 40;
  // x0 = Math.abs(x0);
  // y0 = Math.abs(y0);
  // let cols = Math.abs(w);
  // let rows = Math.abs(h);
  // let mat = new Array(cols);
  // for (let i = 0; i < cols; i++) {
  //   mat[i] = new Array(rows);
  //   for (let j = 0; j < rows; j++) {
  //     mat[i][j] = 1;
  //   }
  // }
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  var cols = Math.floor(w);
  var rows = Math.floor(h);
  var mat = [];
  for (var i = 0; i < cols; i++) {
    mat.push([]);
    for (var j = 0; j < rows; j++) {
      mat[i].push(1);
    }
  }
  for (var _i4 = 0; _i4 < legend_nodes.length; _i4++) {
    var bbox = legend_nodes[_i4].getBoundingClientRect();
    var bx = Math.floor(bbox.left - x0);
    var by = Math.floor(bbox.top - y0);
    fillMat([bx, bx + Math.floor(bbox.width)], [by, by + Math.floor(bbox.height)]);
  }
  return getMaxRect(mat);
}

/**
* Get the x and y parameters to be used to translate a newly created legend
* in order it doesn't overlay existing legends.
*
* @return {Array} - The x and y values to be used to translate the new legend.
*
*/
function getTranslateNewLegend() {
  var legends = svg_map.querySelectorAll('.legend_feature');
  if (legends.length === 0) {
    return [0, 0];
  }
  try {
    return getMaximalAvailableRectangle(legends);
  } catch (e) {
    console.log(e);
    return [0, 0];
  }
}

/**
* Scale the map to the given rectangular bouding box (in geographic coordinates / WGS84),
* redraw the path of all the layer and also reproject the layers containing ponctual
* features (such as symbol layer, labels, etc.)
*
* @param {Array} bbox - The bounding box (as [xmin, ymin, xmax, ymax]) to scale on.
* @return {void}
*
*/
function scale_to_bbox(bbox) {
  var _bbox = _slicedToArray(bbox, 4),
      xmin = _bbox[0],
      ymin = _bbox[1],
      xmax = _bbox[2],
      ymax = _bbox[3];

  var feature = {
    type: 'Feature',
    properties: {},
    id: 0,
    geometry: {
      type: 'LineString',
      coordinates: [[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax], [xmin, ymin]]
    }
  };
  var bboxPath = path.bounds(feature);
  s = 0.95 / Math.max((bboxPath[1][0] - bboxPath[0][0]) / w, (bboxPath[1][1] - bboxPath[0][1]) / h) * proj.scale();
  t = [0, 0];
  proj.scale(s).translate(t);
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
  var zoom_scale = 1;
  var zoom_translate = [(w - zoom_scale * (bboxPath[1][0] + bboxPath[0][0])) / 2, (h - zoom_scale * (bboxPath[1][1] + bboxPath[0][1])) / 2];
  var zoom = svg_map.__zoom;
  zoom.k = zoom_scale;
  zoom.x = zoom_translate[0];
  zoom.y = zoom_translate[1];
  zoom_without_redraw();
}
'use strict';
////////////////////////////////////////////////////////////////////////
// Browse and upload buttons + related actions (conversion + displaying)
////////////////////////////////////////////////////////////////////////

/**
* Maxium allowed input size in bytes. If the input file is larger than
* this size, the user will receive an alert.
* In the case of sending multiple files unziped, this limit corresponds
* to the sum of the size of each file.
*/

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var MAX_INPUT_SIZE = 25200000;

/**
* Function triggered when some images of the interface are clicked
* in order to create an <input> element, simulate a click on it, let the user
* browse its file and dispatch the files to the appropriate handler according
* to the file type
*/
function click_button_add_layer() {
  var self = this;
  var input = document.createElement('input');

  var target_layer_on_add = false;

  if (self.id === 'img_data_ext' || self.id === 'data_ext') {
    input.setAttribute('accept', '.xls,.xlsx,.csv,.tsv,.ods,.txt');
    target_layer_on_add = true;
  } else if (self.id === 'input_geom' || self.id === 'img_in_geom') {
    input.setAttribute('accept', '.kml,.geojson,.topojson,.shp,.dbf,.shx,.prj,.cpg,.json');
    target_layer_on_add = true;
  } else if (self.id === 'input_layout_geom') {
    input.setAttribute('accept', '.kml,.geojson,.topojson,.shp,.dbf,.shx,.prj,.cpg,.json');
  }
  input.setAttribute('type', 'file');
  input.setAttribute('multiple', '');
  input.setAttribute('name', 'file[]');
  input.setAttribute('enctype', 'multipart/form-data');
  input.onchange = function (event) {
    var files = event.target.files;
    handle_upload_files(files, target_layer_on_add, self);
    input.remove();
  };
  input.click();
}

/**
* @param {FileList} files - The files(s) to be handled for this layer
* @param {Boolean} target_layer_on_add - wether this is the target layer or not
* @param {HTMLElement} elem - Optionnal The parent element on which the file was dropped
*
* @return undefined
*/
function handle_upload_files(files, target_layer_on_add, elem) {
  var tot_size = Array.prototype.map.call(files, function (f) {
    return f.size;
  }).reduce(function (a, b) {
    return a + b;
  }, 0);

  if (tot_size > MAX_INPUT_SIZE) {
    // elem.style.border = '3px dashed red';
    elem.style.border = '';
    return swal({ title: i18next.t('app_page.common.error') + '!',
      text: i18next.t('app_page.common.too_large_input'),
      type: 'error',
      customClass: 'swal2_custom',
      allowEscapeKey: false,
      allowOutsideClick: false });
  }
  if (!(files.length === 1)) {
    var files_to_send = [];
    Array.prototype.forEach.call(files, function (f) {
      return f.name.indexOf('.shp') > -1 || f.name.indexOf('.dbf') > -1 || f.name.indexOf('.shx') > -1 || f.name.indexOf('.prj') > -1 || f.name.indexOf('.cpg') > -1 ? files_to_send.push(f) : null;
    });
    elem.style.border = '';
    if (target_layer_on_add && _app.targeted_layer_added) {
      swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.error_only_one'),
        customClass: 'swal2_custom',
        type: 'error',
        allowEscapeKey: false,
        allowOutsideClick: false
      });
    } else if (files_to_send.length >= 4 && files_to_send.length <= 6) {
      handle_shapefile(files_to_send, target_layer_on_add);
      elem.style.border = '';
    } else {
      // elem.style.border = '3px dashed red';
      elem.style.border = '';
      return swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.alert_upload1'),
        customClass: 'swal2_custom',
        type: 'error',
        allowEscapeKey: false,
        allowOutsideClick: false
      });
    }
  } else if (files[0].name.toLowerCase().indexOf('json') > -1 || files[0].name.toLowerCase().indexOf('zip') > -1 || files[0].name.toLowerCase().indexOf('gml') > -1 || files[0].name.toLowerCase().indexOf('kml') > -1) {
    elem.style.border = '';
    if (target_layer_on_add && _app.targeted_layer_added) {
      swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.error_only_one'),
        customClass: 'swal2_custom',
        type: 'error',
        allowEscapeKey: false,
        allowOutsideClick: false
      });
      // Send the file to the server for conversion :
    } else {
      if (files[0].name.toLowerCase().indexOf('json') < 0) {
        handle_single_file(files[0], target_layer_on_add);
      } else {
        var rd = new FileReader();
        rd.onloadend = function () {
          var tmp = void 0;
          try {
            tmp = JSON.parse(rd.result);
          } catch (e) {
            console.log(e);
            return swal({
              title: i18next.t('app_page.common.error') + '!',
              text: i18next.t('app_page.common.alert_upload_invalid'),
              type: 'error',
              customClass: 'swal2_custom',
              allowOutsideClick: false,
              allowEscapeKey: false
            });
          }
          if (tmp.type && tmp.type === 'FeatureCollection') {
            handle_single_file(files[0], target_layer_on_add);
          } else if (tmp.type && tmp.type === 'Topology') {
            handle_TopoJSON_files(files, target_layer_on_add);
          } else if (tmp.map_config && tmp.layers) {
            apply_user_preferences(rd.result);
          } else {
            return swal({
              title: i18next.t('app_page.common.error') + '!',
              text: i18next.t('app_page.common.alert_upload_invalid'),
              type: 'error',
              customClass: 'swal2_custom',
              allowOutsideClick: false,
              allowEscapeKey: false
            });
          }
        };
        rd.readAsText(files[0]);
      }
    }
  } else if (files[0].name.toLowerCase().indexOf('.csv') > -1 || files[0].name.toLowerCase().indexOf('.tsv') > -1) {
    elem.style.border = '';
    if (target_layer_on_add) {
      handle_dataset(files[0], target_layer_on_add);
    } else {
      swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.error_only_layout'),
        type: 'error',
        customClass: 'swal2_custom',
        allowEscapeKey: false,
        allowOutsideClick: false
      });
    }
  } else if (files[0].name.toLowerCase().indexOf('.xls') > -1 || files[0].name.toLowerCase().indexOf('.ods') > -1) {
    elem.style.border = '';
    if (target_layer_on_add) {
      convert_dataset(files[0]);
    } else {
      swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.error_only_layout'),
        type: 'error',
        customClass: 'swal2_custom',
        allowEscapeKey: false,
        allowOutsideClick: false
      });
    }
  } else {
    elem.style.border = '';
    var shp_part = void 0;
    Array.prototype.forEach.call(files, function (f) {
      return f.name.indexOf('.shp') > -1 || f.name.indexOf('.dbf') > -1 || f.name.indexOf('.shx') > -1 || f.name.indexOf('.prj') > -1 ? shp_part = true : null;
    });
    if (shp_part) {
      return swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.alert_upload_shp'),
        type: 'error',
        customClass: 'swal2_custom',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(function (valid) {
        return null;
      }, function (dismiss) {
        return null;
      });
    } else {
      return swal({
        title: i18next.t('app_page.common.error') + '!',
        text: i18next.t('app_page.common.alert_upload_invalid'),
        type: 'error',
        customClass: 'swal2_custom',
        allowOutsideClick: false,
        allowEscapeKey: false
      });
    }
  }
}

function handleOneByOneShp(files, target_layer_on_add) {
  function populate_shp_slot(slots, file) {
    if (file.name.indexOf('.shp') > -1) {
      slots.set('.shp', file);
      document.getElementById('f_shp').className = 'mini_button_ok';
    } else if (file.name.indexOf('.shx') > -1) {
      slots.set('.shx', file);
      document.getElementById('f_shx').className = 'mini_button_ok';
    } else if (file.name.indexOf('.prj') > -1) {
      slots.set('.prj', file);
      document.getElementById('f_prj').className = 'mini_button_ok';
    } else if (file.name.indexOf('.dbf') > -1) {
      slots.set('.dbf', file);
      document.getElementById('f_dbf').className = 'mini_button_ok';
    } else if (file.name.indexOf('.cpg') > -1) {
      slots.set('.cpg', file);
      document.getElementById('f_cpg').className = 'mini_button_ok';
    } else {
      return false;
    }
  }

  swal({
    title: '',
    html: '<div style="border: dashed 1px green;border-radius: 1%;" id="dv_drop_shp">' + '<strong>Shapefile detected - Missing files to upload</strong><br>' + '<p><i>Drop missing files in this area</i></p><br>' + '<image id="img_drop" src="static/img/Ic_file_download_48px.svg"><br>' + '<p id="f_shp" class="mini_button_none">.shp</p><p id="f_shx" class="mini_button_none">.shx</p>' + '<p id="f_dbf" class="mini_button_none">.dbf</p><p id="f_prj" class="mini_button_none">.prj</p>' + '<p id="f_cpg" class="mini_button_none_orange">.cpg</p></div>',
    type: 'info',
    showCancelButton: true,
    showCloseButton: false,
    allowEscapeKey: true,
    allowOutsideClick: false,
    confirmButtonColor: '#DD6B55',
    confirmButtonText: i18next.t('app_page.common.confirm'),
    preConfirm: function preConfirm() {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (!(shp_slots.size === 4 && !shp_slots.has('.cpg') || shp_slots.size === 5)) {
            reject('Missing files');
          } else {
            resolve();
          }
        }, 50);
      });
    }
  }).then(function () {
    var file_list = [shp_slots.get('.shp'), shp_slots.get('.shx'), shp_slots.get('.dbf'), shp_slots.get('.prj')];
    if (shp_slots.has('.cpg')) {
      file_list.push(shp_slots.get('.cpg'));
    }
    for (var i = 0; i < file_list.length; i++) {
      if (file_list[i].size > MAX_INPUT_SIZE) {
        overlay_drop.style.display = 'none';
        return swal({
          title: i18next.t('app_page.common.error') + '!',
          text: i18next.t('app_page.common.too_large_input'),
          type: 'error',
          allowEscapeKey: false,
          allowOutsideClick: false
        });
      }
    }

    if (target_layer_on_add) {
      handle_shapefile(file_list, target_layer_on_add);
    } else {
      var opts = _app.targeted_layer_added ? { layout: i18next.t('app_page.common.layout_l') } : { target: i18next.t('app_page.common.target_l'), layout: i18next.t('app_page.common.layout_l') };
      swal({
        title: '',
        text: i18next.t('app_page.common.layer_type_selection'),
        type: 'info',
        showCancelButton: true,
        showCloseButton: false,
        allowEscapeKey: true,
        allowOutsideClick: false,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: i18next.t('app_page.common.confirm'),
        input: 'select',
        inputPlaceholder: i18next.t('app_page.common.layer_type_selection'),
        inputOptions: opts,
        inputValidator: function inputValidator(value) {
          return new Promise(function (resolve, reject) {
            if (value.indexOf('target') < 0 && value.indexOf('layout') < 0) {
              reject(i18next.t('app_page.common.no_value'));
            } else {
              resolve();
              handle_shapefile(file_list, value === 'target');
            }
          });
        }
      }).then(function (val) {
        overlay_drop.style.display = 'none';
      }, function (dismiss) {
        overlay_drop.style.display = 'none';
        console.log(dismiss);
      });
    }
  }, function (dismiss) {
    overlay_drop.style.display = 'none';
    console.log(dismiss);
  });
  var shp_slots = new Map();
  populate_shp_slot(shp_slots, files[0]);
  document.getElementById('dv_drop_shp').addEventListener('drop', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var next_files = event.dataTransfer.files;
    for (var f_ix = 0; f_ix < next_files.length; f_ix++) {
      // let file = next_files[f_ix];
      populate_shp_slot(shp_slots, next_files[f_ix]);
    }
    if (shp_slots.size === 4 && !shp_slots.has('.cpg') || shp_slots.size === 5) {
      // const elem = document.getElementById('dv_drop_shp');
      // elem.innerHTML = elem.innerHTML.replace('Ic_file_download_48px.svg', 'Ic_check_36px.svg');
      this.innerHTML = this.innerHTML.replace('Ic_file_download_48px.svg', 'Ic_check_36px.svg');
    }
  });
  document.getElementById('dv_drop_shp').addEventListener('dragover', function (event) {
    this.style.border = 'dashed 2.5px green';
    event.preventDefault();event.stopPropagation();
  });
  document.getElementById('dv_drop_shp').addEventListener('dragleave', function (event) {
    this.style.border = 'dashed 1px green';
    event.preventDefault();event.stopPropagation();
  });
}

/**
* Function called to bind the "drop zone" on the 2 desired menu elements
*
*/
function prepare_drop_section() {
  var timeout = void 0;
  Array.prototype.forEach.call(document.querySelectorAll('#map,.overlay_drop'), function (elem) {
    elem.addEventListener('dragenter', function (e) {
      e.preventDefault();e.stopPropagation();
      if (document.body.classList.contains('no-drop')) return;
      document.getElementById('overlay_drop').style.display = '';
    });

    elem.addEventListener('dragover', function (e) {
      e.preventDefault();e.stopPropagation();
      if (document.body.classList.contains('no-drop')) return;
      if (timeout) {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          e.preventDefault();e.stopPropagation();
          document.getElementById('overlay_drop').style.display = 'none';
          timeout = null;
        }, 2500);
      }
    });

    elem.addEventListener('dragleave', function (e) {
      e.preventDefault();e.stopPropagation();
      if (document.body.classList.contains('no-drop')) {
        document.body.classList.remove('no-drop');
        return;
      }
      timeout = setTimeout(function () {
        document.getElementById('overlay_drop').style.display = 'none';
        timeout = null;
      }, 2500);
    });

    elem.addEventListener('drop', function _drop_func(e) {
      e.preventDefault();e.stopPropagation();
      if (timeout) {
        clearTimeout(timeout);
      }
      if (document.body.classList.contains('no-drop') || !e.dataTransfer.files.length) {
        document.getElementById('overlay_drop').style.display = 'none';
        return;
      }
      var overlay_drop = document.getElementById('overlay_drop');
      overlay_drop.style.display = '';
      var files = e.dataTransfer.files;
      if (files.length === 1 && (files[0].name.indexOf('.shp') > -1 || files[0].name.indexOf('.shx') > -1 || files[0].name.indexOf('.dbf') > -1 || files[0].name.indexOf('.prj') > -1)) {
        Array.prototype.forEach.call(document.querySelectorAll('#map,.overlay_drop'), function (_elem) {
          _elem.removeEventListener('drop', _drop_func);
        });
        handleOneByOneShp(files);
      } else {
        var opts = void 0;
        if (files[0].name.indexOf('.csv') > -1 || files[0].name.indexOf('.tsv') > -1 || files[0].name.indexOf('.txt') > -1 || files[0].name.indexOf('.xls') > -1 || files[0].name.indexOf('.xlsx') > -1 || files[0].name.indexOf('.ods') > -1) {
          opts = { target: i18next.t('app_page.common.ext_dataset') };
        } else {
          opts = _app.targeted_layer_added ? { layout: i18next.t('app_page.common.layout_l') } : { target: i18next.t('app_page.common.target_l'), layout: i18next.t('app_page.common.layout_l') };
        }
        swal({
          title: '',
          text: i18next.t('app_page.common.layer_type_selection'),
          type: 'info',
          showCancelButton: true,
          showCloseButton: false,
          allowEscapeKey: true,
          allowOutsideClick: false,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: i18next.t('app_page.common.confirm'),
          input: 'select',
          inputPlaceholder: i18next.t('app_page.common.layer_type_selection'),
          inputOptions: opts,
          inputValidator: function inputValidator(value) {
            return new Promise(function (resolve, reject) {
              if (value.indexOf('target') < 0 && value.indexOf('layout') < 0) {
                reject(i18next.t('app_page.common.no_value'));
              } else {
                // resolve();
                // handle_upload_files(files, value === "target", elem);
                resolve(handle_upload_files(files, value === 'target', elem));
              }
            });
          }
        }).then(function (value) {
          overlay_drop.style.display = 'none';
        }, function (dismiss) {
          overlay_drop.style.display = 'none';
          console.log(dismiss);
        });
      }
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('#section1,#section3'), function (elem) {
    elem.addEventListener('dragenter', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (document.body.classList.contains('no-drop')) return;
      elem.style.border = '3px dashed green';
    });
    elem.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (document.body.classList.contains('no-drop')) return;
      elem.style.border = '3px dashed green';
    });
    elem.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      elem.style.border = '';
      if (document.body.classList.contains('no-drop')) {
        document.body.classList.remove('no-drop');
      }
    });
    elem.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!e.dataTransfer.files.length) {
        elem.style.border = '';
        return;
      }
      var files = e.dataTransfer.files,
          target_layer_on_add = elem.id === 'section1';
      if (files.length === 1 && (files[0].name.indexOf('.shp') > -1 || files[0].name.indexOf('.shx') > -1 || files[0].name.indexOf('.dbf') > -1 || files[0].name.indexOf('.prj') > -1)) {
        handleOneByOneShp(files, target_layer_on_add);
      } else {
        handle_upload_files(files, target_layer_on_add, elem);
      }
    }, true);
  });
}

function ask_replace_dataset() {
  return swal({
    title: '',
    text: i18next.t('app_page.common.ask_replace_dataset'),
    type: 'warning',
    showCancelButton: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonColor: '#DD6B55',
    confirmButtonText: i18next.t('app_page.common.confirm')
  });
}

function convert_dataset(file) {
  var do_convert = function do_convert() {
    var ajaxData = new FormData();
    ajaxData.append('action', 'submit_form');
    ajaxData.append('file[]', file);
    xhrequest('POST', 'convert_tabular', ajaxData, true).then(function (raw_data) {
      var data = JSON.parse(raw_data);
      dataset_name = data.name;
      swal({
        title: '',
        text: i18next.t('app_page.common.warn_xls_sheet') + (data.message ? '\n' + i18next.t(data.message[0], { sheet_name: data.message[1][0] }) : ''),
        type: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(function () {
        add_dataset(d3.csvParse(data.file));
      }, function (dismiss) {
        return null;
      });
    }, function (error) {
      display_error_during_computation();
    });
  };

  if (joined_dataset.length !== 0) {
    ask_replace_dataset().then(function () {
      remove_ext_dataset_cleanup();
      do_convert();
    }, function () {
      return null;
    });
  } else {
    do_convert();
  }
}

function handle_shapefile(files, target_layer_on_add) {
  var ajaxData = new FormData();
  ajaxData.append('action', 'submit_form');
  for (var j = 0; j < files.length; j++) {
    ajaxData.append('file[' + j + ']', files[j]);
  }
  xhrequest('POST', 'convert_to_topojson', ajaxData, true).then(function (data) {
    add_layer_topojson(data, { target_layer_on_add: target_layer_on_add });
  }, function (error) {
    display_error_during_computation();
  });
}

function handle_TopoJSON_files(files, target_layer_on_add) {
  var f = files[0],
      name = files[0].name,
      reader = new FileReader(),
      ajaxData = new FormData();
  ajaxData.append('file[]', f);
  xhrequest('POST', 'convert_topojson', ajaxData, false).then(function (res) {
    var key = JSON.parse(res).key;
    reader.onloadend = function () {
      var text = reader.result;
      var topoObjText = ['{"key": ', key, ',"file":', text, '}'].join('');
      add_layer_topojson(topoObjText, { target_layer_on_add: target_layer_on_add });
    };
    reader.readAsText(f);
  }, function (error) {
    display_error_during_computation();
  });
}

function handle_reload_TopoJSON(text, param_add_func) {
  var ajaxData = new FormData();
  var f = new Blob([text], { type: 'application/json' });
  ajaxData.append('file[]', f);

  // let topoObjText = ['{"key":null,"file":', text, '}'].join('');
  var layer_name = add_layer_topojson(['{"key":null,"file":', text, '}'].join(''), param_add_func);
  xhrequest('POST', 'convert_topojson', ajaxData, false).then(function (response) {
    var key = JSON.parse(response).key;
    current_layers[layer_name].key_name = key;
  });
  return layer_name;
}

// function handle_reload_TopoJSON(text, param_add_func){
//     var ajaxData = new FormData();
//     var f = new Blob([text], {type: "application/json"});
//     ajaxData.append('file[]', f);
//
//     return xhrequest("POST", 'cache_topojson/user', ajaxData, false).then(function(response){
//         let res = response,
//             key = JSON.parse(res).key,
//             topoObjText = ['{"key": ', key, ',"file":', text, '}'].join('');
//         let layer_name = add_layer_topojson(topoObjText, param_add_func);
//         return layer_name;
//     });
// }

/**
* Handle a csv dataset by parsing it as an array of Object (ie features) or by
* converting it to topojson if it contains valid x/y/lat/lon/etc. columns and
* adding it to the map
* @param {File} f - The input csv file
*/
function handle_dataset(f, target_layer_on_add) {
  var check_dataset = function check_dataset() {
    var reader = new FileReader(),
        name = f.name;

    reader.onload = function (e) {
      var data = e.target.result;
      var encoding = jschardet.detect(data).encoding;
      var new_reader = new FileReader();
      new_reader.onload = function (ev) {
        data = ev.target.result;
        var sep = data.split('\n')[0];
        if (sep.indexOf('\t') > -1) {
          sep = '\t';
        } else if (sep.indexOf(';') > -1) {
          sep = ';';
        } else {
          sep = ',';
        }

        var tmp_dataset = d3.dsvFormat(sep).parse(data);
        var field_names = Object.getOwnPropertyNames(tmp_dataset[0]).map(function (el) {
          return el.toLowerCase ? el.toLowerCase() : el;
        });
        if (field_names.indexOf('x') > -1 || field_names.indexOf('lat') > -1 || field_names.indexOf('latitude') > -1) {
          if (field_names.indexOf('y') > -1 || field_names.indexOf('lon') > -1 || field_names.indexOf('longitude') > -1 || field_names.indexOf('long') > -1 || field_names.indexOf('lng') > -1) {
            if (target_layer_on_add && _app.targeted_layer_added) {
              swal({
                title: i18next.t('app_page.common.error') + '!',
                text: i18next.t('app_page.common.error_only_one'),
                customClass: 'swal2_custom',
                type: 'error',
                allowEscapeKey: false,
                allowOutsideClick: false });
            } else {
              add_csv_geom(data, name.substring(0, name.indexOf('.csv')));
            }
            return;
          }
        }
        dataset_name = name.substring(0, name.indexOf('.csv'));
        add_dataset(tmp_dataset);
      };
      new_reader.readAsText(f, encoding);
    };
    reader.readAsBinaryString(f);
  };

  if (joined_dataset.length !== 0) {
    ask_replace_dataset().then(function () {
      remove_ext_dataset_cleanup();
      check_dataset();
    }, function (dismiss) {
      return null;
    });
  } else {
    check_dataset();
  }
}

// function handle_dataset(f, target_layer_on_add){
//     function box_dataset(){
//         createBoxTextImportWizard(f).then(confirm => {
//             if(confirm){
//                 let [tmp_dataset, valid] = confirm;
//                 console.log(tmp_dataset, valid);
//                 let field_name = Object.getOwnPropertyNames(tmp_dataset[0]);
//                 if(field_name.indexOf("x") > -1 || field_name.indexOf("X") > -1 || field_name.indexOf("lat") > -1 || field_name.indexOf("latitude") > -1){
//                     if(field_name.indexOf("y") > -1 || field_name.indexOf("Y") > -1 || field_name.indexOf("lon") > -1 || field_name.indexOf("longitude") > -1 || field_name.indexOf("long") > -1){
//                         if(target_layer_on_add && _app.targeted_layer_added){
//                             swal({title: i18next.t("app_page.common.error") + "!",
//                                   text: i18next.t('app_page.common.error_only_one'),
//                                   customClass: 'swal2_custom',
//                                   type: "error",
//                                   allowEscapeKey: false,
//                                   allowOutsideClick: false});
//
//                         } else {
//                             let reader = new FileReader(),
//                                 name = f.name;
//
//                             reader.onload = function(e) {
//                                 add_csv_geom(e.target.result, f.name.substring(0, name.indexOf('.csv')));
//                             }
//                             reader.readAsText();
//                         }
//                         return;
//                     }
//                 }
//                 dataset_name = f.name.substring(0, f.name.indexOf('.csv'));
//                 add_dataset(tmp_dataset);
//             }
//         });
//     }
//
//     if(joined_dataset.length !== 0){
//         ask_replace_dataset().then(() => {
//             remove_ext_dataset_cleanup();
//             box_dataset();
//           }, () => { null; });
//     } else {
//         box_dataset();
//     }
// }

function update_menu_dataset() {
  var d_name = dataset_name.length > 20 ? [dataset_name.substring(0, 17), '(...)'].join('') : dataset_name,
      nb_features = joined_dataset[0].length,
      field_names = Object.getOwnPropertyNames(joined_dataset[0][0]),
      data_ext = document.getElementById('data_ext'),
      parent_elem = data_ext.parentElement;

  d3.select(parent_elem.firstChild).attrs({
    id: 'img_data_ext',
    class: 'user_panel',
    src: 'static/img/b/tabular.png',
    width: '26',
    height: '26',
    alt: 'Additional dataset' });

  data_ext.classList.remove('i18n');
  data_ext.removeAttribute('data-i18n');
  d3.select(data_ext).html([' <b>', d_name, '</b> - <i><span style="font-size:9px;">', nb_features, ' ', i18next.t('app_page.common.feature', { count: +nb_features }), ' - ', field_names.length, ' ', i18next.t('app_page.common.field', { count: +field_names.length }), '</i></span>'].join('')).on('click', null);
  parent_elem.innerHTML += '<img width="13" height="13" src="static/img/Trash_font_awesome.png" id="remove_dataset" style="float:right;margin-top:10px;opacity:0.5">\n<img width="14" height="14" src="static/img/dataset.png" id="table_dataset_s1" style="float:right;margin:10px 5px 0 0;opacity:1">';

  document.getElementById('remove_dataset').onclick = function () {
    remove_ext_dataset();
  };
  document.getElementById('remove_dataset').onmouseover = function () {
    this.style.opacity = 1;
  };
  document.getElementById('remove_dataset').onmouseout = function () {
    this.style.opacity = 0.5;
  };
  if (_app.targeted_layer_added) {
    valid_join_check_display(false);
  }
  document.getElementById('table_dataset_s1').onclick = function () {
    boxExplore2.create(dataset_name);
  };
}

/**
*
*
*/
function add_dataset(readed_dataset) {
  // Check if their is an empty name in the columns name (typically the first one) and replace it by UID:
  if (readed_dataset[0].hasOwnProperty('')) {
    var new_col_name = !readed_dataset[0].hasOwnProperty('UID') ? 'UID' : 'Undefined_Name';
    for (var i = 0; i < readed_dataset.length; ++i) {
      readed_dataset[i][new_col_name] = readed_dataset[i][''];
      delete readed_dataset[i][''];
    }
  }

  var cols = Object.getOwnPropertyNames(readed_dataset[0]);

  // Test if there is an empty last line and remove it if its the case :
  if (cols.map(function (f) {
    return readed_dataset[readed_dataset.length - 1][f];
  }).every(function (f) {
    return f === '' || f === undefined;
  })) {
    readed_dataset = readed_dataset.slice(0, readed_dataset.length - 1);
  }

  // Suboptimal way to convert an eventual comma decimal separator to a point decimal separator :
  for (var _i = 0; _i < cols.length; _i++) {
    var tmp = [];
    // Check that all values of this field can be coerced to Number :
    for (var j = 0; j < readed_dataset.length; j++) {
      if (readed_dataset[j][cols[_i]].replace && (!isNaN(+readed_dataset[j][cols[_i]].replace(',', '.')) || !isNaN(+readed_dataset[j][cols[_i]].split(' ').join(''))) || !isNaN(+readed_dataset[j][cols[_i]])) {
        // Add the converted value to temporary field if its ok ...
        var t_val = readed_dataset[j][cols[_i]].replace(',', '.').split(' ').join('');
        tmp.push(isFinite(t_val) && t_val !== '' && t_val != null ? +t_val : t_val);
      } else {
        // Or break early if a value can't be coerced :
        break; // So no value of this field will be converted
      }
    }
    // If the whole field has been converted successfully, apply the modification :
    if (tmp.length === readed_dataset.length) {
      for (var _j = 0; _j < readed_dataset.length; _j++) {
        readed_dataset[_j][cols[_i]] = tmp[_j];
      }
    }
  }
  joined_dataset.push(readed_dataset);

  update_menu_dataset();

  if (_app.current_functionnality && _app.current_functionnality.name === 'flow') {
    fields_handler.fill();
  }

  if (_app.targeted_layer_added) {
    var layer_name = Object.getOwnPropertyNames(user_data)[0];
    ask_join_now(layer_name, 'dataset');
  }
}

function add_csv_geom(file, name) {
  var ajaxData = new FormData();
  ajaxData.append('filename', name);
  ajaxData.append('csv_file', file);
  xhrequest('POST', 'convert_csv_geo', ajaxData, true).then(function (data) {
    dataset_name = undefined;
    add_layer_topojson(data, { target_layer_on_add: true });
  }, function (error) {
    display_error_during_computation();
  });
}

/**
* Send a single file (.zip / .kml / .gml / .geojson) to the server in order to get
* the converted layer added to the map
* @param {File} file
*/
function handle_single_file(file, target_layer_on_add) {
  var ajaxData = new FormData();
  ajaxData.append('action', 'single_file');
  ajaxData.append('file[]', file);
  xhrequest('POST', '/convert_to_topojson', ajaxData, true).then(function (data) {
    add_layer_topojson(data, { target_layer_on_add: target_layer_on_add });
  }, function (error) {
    display_error_during_computation();
  });
}

function update_section1(type, nb_fields, nb_ft, lyr_name_to_add) {
  var nb_char_display = lyr_name_to_add.length + nb_fields.toString().length + nb_ft.toString().length;
  var _lyr_name_display = +nb_char_display > 23 ? [lyr_name_to_add.substring(0, 18), '(...)'].join('') : lyr_name_to_add;
  var _input_geom = document.getElementById('input_geom');
  var _button = button_type.get(type);

  _button = _button.substring(10, _button.indexOf('class') - 2);

  _input_geom.classList.remove('i18n');
  _input_geom.removeAttribute('data-i18n');
  // _input_geom.innerHTML = `<b>${_lyr_name_display}</b> - <i><span style="font-size:9px;">${nb_ft} ${i18next.t('app_page.common.feature', { count: +nb_ft })} - ${nb_fields} ${i18next.t('app_page.common.field', { count: +nb_fields })}</i></span>`;
  d3.select(_input_geom).attrs({ src: _button, width: '26', height: '26' }).html('<b>' + _lyr_name_display + '</b> - <i><span style="font-size:9px;">' + nb_ft + ' ' + i18next.t('app_page.common.feature', { count: +nb_ft }) + ' - ' + nb_fields + ' ' + i18next.t('app_page.common.field', { count: +nb_fields }) + '</i></span>').on('click', null);
  _input_geom.parentElement.innerHTML = _input_geom.parentElement.innerHTML + '\n<img width="13" height="13" src="static/img/Trash_font_awesome.png" id="remove_target" style="float:right;margin-top:10px;opacity:0.5">\n<img width="14" height="14" src="static/img/dataset.png" id="table_layer_s1" style="float:right;margin:10px 5px 0 0;opacity:1">';
  var remove_target = document.getElementById('remove_target');
  remove_target.onclick = function () {
    remove_layer(Object.getOwnPropertyNames(user_data)[0]);
  };
  remove_target.onmouseover = function () {
    this.style.opacity = 1;
  };
  remove_target.onmouseout = function () {
    this.style.opacity = 0.5;
  };
  var table_target = document.getElementById('table_layer_s1');
  table_target.onclick = display_table_target_layer;
}

function get_display_name_on_layer_list(layer_name_to_add) {
  return +layer_name_to_add.length > 40 ? [layer_name_to_add.substring(0, 37), '(...)'].join('') : layer_name_to_add;
}

function ask_join_now(layer_name) {
  var on_add = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'layer';

  swal({
    title: '',
    text: i18next.t('app_page.join_box.before_join_ask'),
    allowOutsideClick: false,
    allowEscapeKey: true,
    type: 'question',
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText: i18next.t('app_page.common.yes'),
    cancelButtonText: i18next.t('app_page.common.no')
  }).then(function () {
    createJoinBox(layer_name);
  }, function (dismiss) {
    if (on_add === 'layer') make_box_type_fields(layer_name);
  });
}

function ask_existing_feature(feature_name) {
  return swal({
    title: '',
    text: i18next.t('app_page.common.error_existing_' + feature_name),
    allowOutsideClick: false,
    allowEscapeKey: false,
    type: 'question',
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText: i18next.t('app_page.common.yes'),
    cancelButtonText: i18next.t('app_page.common.no')
  });
}

var display_table_target_layer = function display_table_target_layer() {
  var layer_name = Object.keys(user_data)[0];
  boxExplore2.create(layer_name);
};

// Add the TopoJSON to the 'svg' element :
function add_layer_topojson(text) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var parsedJSON = void 0;
  try {
    parsedJSON = JSON.parse(text);
  } catch (e) {
    parsedJSON = { Error: 'Unable to load the layer' };
  }
  if (parsedJSON.Error) {
    // Server returns a JSON reponse like {"Error":"The error"} if something went bad during the conversion
    display_error_during_computation(parsedJSON.Error);
    return;
  }
  var result_layer_on_add = options.result_layer_on_add ? true : false,
      target_layer_on_add = options.target_layer_on_add ? true : false,
      skip_alert = options.skip_alert ? true : false,
      skip_rescale = options.skip_rescale === true ? true : false,
      fields_type = options.fields_type ? options.fields_type : undefined;
  var topoObj = parsedJSON.file.transform ? parsedJSON.file : topojson.quantize(parsedJSON.file, 1e5);
  var layers_names = Object.getOwnPropertyNames(topoObj.objects);
  var random_color1 = ColorsSelected.random();
  var lyr_name = layers_names[0];
  var lyr_name_to_add = check_layer_name(options.choosed_name ? options.choosed_name : lyr_name);
  var lyr_id = encodeId(lyr_name_to_add);
  var nb_ft = topoObj.objects[lyr_name].geometries.length;
  var topoObj_objects = topoObj.objects[lyr_name];
  var data_to_load = false;
  var type = void 0,
      _proj = void 0;

  if (layers_names.length > 1) {
    swal('', i18next.t('app_page.common.warning_multiple_layers'), 'warning');
  }

  if (!topoObj_objects.geometries || topoObj_objects.geometries.length === 0) {
    display_error_during_computation(i18next.t('app_page.common.error_invalid_empty'));
    return;
  }

  _app.layer_to_id.set(lyr_name_to_add, lyr_id);
  _app.id_to_layer.set(lyr_id, lyr_name_to_add);

  for (var _t_ix = 0; _t_ix < nb_ft; _t_ix++) {
    if (topoObj_objects.geometries[_t_ix] && topoObj_objects.geometries[_t_ix].type) {
      if (topoObj_objects.geometries[_t_ix].type.indexOf('Point') > -1) type = 'Point';else if (topoObj_objects.geometries[_t_ix].type.indexOf('LineString') > -1) type = 'Line';else if (topoObj_objects.geometries[_t_ix].type.indexOf('Polygon') > -1) type = 'Polygon';
      break;
    }
  }

  if (!type) {
    display_error_during_computation(i18next.t('app_page.common.error_invalid_empty'));
    return;
  }

  if (_app.first_layer) {
    // remove_layer_cleanup('World');
    var world_id = _app.layer_to_id.get('World');
    var q = document.querySelector('.sortable.' + world_id + ' > .layer_buttons > #eye_open');
    if (q) q.click();
    delete _app.first_layer;
    if (parsedJSON.proj) {
      try {
        _proj = proj4(parsedJSON.proj);
      } catch (e) {
        _proj = undefined;
        console.log(e);
      }
    }
  }

  current_layers[lyr_name_to_add] = {
    type: type,
    n_features: nb_ft,
    'stroke-width-const': type === 'Line' ? 1.5 : 0.4,
    fill_color: { single: random_color1 },
    key_name: parsedJSON.key
  };

  if (target_layer_on_add) {
    current_layers[lyr_name_to_add].targeted = true;
    user_data[lyr_name_to_add] = [];
    data_to_load = true;
    current_layers[lyr_name_to_add].fields_type = [];
  } else if (result_layer_on_add) {
    result_data[lyr_name_to_add] = [];
    current_layers[lyr_name_to_add].is_result = true;
  }

  var field_names = topoObj_objects.geometries[0].properties ? Object.getOwnPropertyNames(topoObj_objects.geometries[0].properties) : [];
  var path_to_use = options.pointRadius ? path.pointRadius(options.pointRadius) : path;
  var nb_fields = field_names.length;
  var func_data_idx = void 0;

  if (data_to_load && nb_fields > 0) {
    func_data_idx = function func_data_idx(d, ix) {
      if (d.id != undefined && d.id != ix) {
        d.properties['_uid'] = d.id;
        d.id = +ix;
      }
      user_data[lyr_name_to_add].push(d.properties);
      return 'feature_' + ix;
    };
  } else if (data_to_load) {
    func_data_idx = function func_data_idx(d, ix) {
      d.properties.id = d.id || ix;
      user_data[lyr_name_to_add].push({ id: d.properties.id });
      return 'feature_' + ix;
    };
  } else if (result_layer_on_add) {
    func_data_idx = function func_data_idx(d, ix) {
      result_data[lyr_name_to_add].push(d.properties);
      return 'feature_' + ix;
    };
  } else {
    func_data_idx = function func_data_idx(_, ix) {
      return 'feature_' + ix;
    };
  }

  map.insert('g', '.legend').attrs({ id: lyr_id, class: data_to_load ? 'targeted_layer layer' : 'layer' }).styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }).selectAll('.subunit').data(topojson.feature(topoObj, topoObj_objects).features).enter().append('path').attrs({ d: path_to_use, height: '100%', width: '100%' }).attr('id', func_data_idx).styles({
    stroke: type !== 'Line' ? 'rgb(0, 0, 0)' : random_color1,
    'stroke-opacity': 1,
    fill: type !== 'Line' ? random_color1 : null,
    'fill-opacity': type !== 'Line' ? 0.90 : 0
  });

  var class_name = [target_layer_on_add ? 'sortable_target ' : result_layer_on_add ? 'sortable_result ' : null, lyr_id].join('');

  var layers_listed = layer_list.node(),
      li = document.createElement('li'),
      _lyr_name_display_menu = get_display_name_on_layer_list(lyr_name_to_add);

  li.setAttribute('class', class_name);
  li.setAttribute('layer_name', lyr_name_to_add);
  d3.select('#layer_to_export').append('option').attr('value', lyr_name_to_add).text(lyr_name_to_add);
  if (target_layer_on_add) {
    current_layers[lyr_name_to_add].original_fields = new Set(Object.getOwnPropertyNames(user_data[lyr_name_to_add][0]));
    if (joined_dataset.length !== 0) {
      valid_join_check_display(false);
    }

    document.getElementById('sample_zone').style.display = 'none';

    update_section1(type, nb_fields, nb_ft, lyr_name_to_add);
    _app.targeted_layer_added = true;
    li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_type.get(type), '</div>'].join('');

    window._target_layer_file = topoObj;
    if (!skip_rescale) {
      scale_to_lyr(lyr_name_to_add);
      center_map(lyr_name_to_add);
    }
    handle_click_hand('lock');
    if (_app.current_functionnality !== undefined) {
      fields_handler.fill(lyr_name_to_add);
    }
    handle_click_hand('lock');
  } else if (result_layer_on_add) {
    li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_legend, button_result_type.get(options.func_name), '</div>'].join('');
    if (!skip_rescale) {
      center_map(lyr_name_to_add);
    }
  } else {
    li.innerHTML = [_lyr_name_display_menu, '<div class="layer_buttons">', button_trash, sys_run_button_t2, button_zoom_fit, button_table, eye_open0, button_type.get(type), '</div>'].join('');
  }

  if (!target_layer_on_add && _app.current_functionnality != undefined && _app.current_functionnality.name === 'smooth') {
    fields_handler.fill();
  }

  if (type === 'Point') {
    current_layers[lyr_name_to_add].pointRadius = options.pointRadius || path.pointRadius();
  }

  layers_listed.insertBefore(li, layers_listed.childNodes[0]);
  handleClipPath(current_proj_name);
  binds_layers_buttons(lyr_name_to_add);
  if (!skip_rescale) {
    zoom_without_redraw();
  }

  if (!skip_alert) {
    if (fields_type) {
      current_layers[lyr_name_to_add].fields_type = fields_type;
    }
    if (_proj === undefined) {
      swal({
        title: '',
        text: i18next.t('app_page.common.layer_success'),
        allowOutsideClick: true,
        allowEscapeKey: true,
        type: 'success'
      }).then(function () {
        if (target_layer_on_add && joined_dataset.length > 0) {
          ask_join_now(lyr_name_to_add);
        } else if (target_layer_on_add) {
          make_box_type_fields(lyr_name_to_add);
        }
      }, function (dismiss) {
        if (target_layer_on_add && joined_dataset.length > 0) {
          ask_join_now(lyr_name_to_add);
        } else if (target_layer_on_add) {
          make_box_type_fields(lyr_name_to_add);
        }
      });
    } else {
      swal({
        title: '',
        text: i18next.t('app_page.common.layer_success_and_proj'),
        showCancelButton: true,
        showCloseButton: false,
        allowEscapeKey: true,
        allowOutsideClick: true,
        type: 'success'
      }).then(function () {
        change_projection_4(_proj);
        current_proj_name = 'def_proj4';
        _app.last_projection = parsedJSON.proj;
        addLastProjectionSelect('def_proj4', _app.last_projection);
        if (target_layer_on_add && joined_dataset.length > 0) {
          ask_join_now(lyr_name_to_add);
        } else if (target_layer_on_add) {
          make_box_type_fields(lyr_name_to_add);
        }
      }, function (dismiss) {
        if (target_layer_on_add && joined_dataset.length > 0) {
          ask_join_now(lyr_name_to_add);
        } else if (target_layer_on_add) {
          make_box_type_fields(lyr_name_to_add);
        }
      });
    }
  }

  if (options.default_projection) {
    if (options.default_projection[0] === 'proj4') {
      change_projection_4(proj4(options.default_projection[1]));
      current_proj_name = 'def_proj4';
      _app.last_projection = options.default_projection[1];
      addLastProjectionSelect('def_proj4', _app.last_projection);
    } else if (options.default_projection[0] === 'd3') {
      current_proj_name = options.default_projection[1];
      change_projection(options.default_projection[1]);
      addLastProjectionSelect(current_proj_name);
    }
  }
  return lyr_name_to_add;
}

/**
*  Get the bounding box (in map/svg coordinates) of a layer using path.bounds()
*
*  @param {string} name - The name of layer
*/
function get_bbox_layer_path(name) {
  var selec = svg_map.querySelector('#' + _app.layer_to_id.get(name)).childNodes;
  var bbox_layer_path = [[Infinity, Infinity], [-Infinity, -Infinity]];
  for (var i = 0, len_i = selec.length; i < len_i; i++) {
    var bbox_path = path.bounds(selec[i].__data__);
    bbox_layer_path[0][0] = bbox_path[0][0] < bbox_layer_path[0][0] ? bbox_path[0][0] : bbox_layer_path[0][0];
    bbox_layer_path[0][1] = bbox_path[0][1] < bbox_layer_path[0][1] ? bbox_path[0][1] : bbox_layer_path[0][1];
    bbox_layer_path[1][0] = bbox_path[1][0] > bbox_layer_path[1][0] ? bbox_path[1][0] : bbox_layer_path[1][0];
    bbox_layer_path[1][1] = bbox_path[1][1] > bbox_layer_path[1][1] ? bbox_path[1][1] : bbox_layer_path[1][1];
  }
  if (current_proj_name === 'ConicConformal') {
    var s1 = Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h);
    var bbox_layer_path2 = path.bounds({ type: 'MultiPoint', coordinates: [[-69.3, -55.1], [20.9, -36.7], [147.2, -42.2], [162.1, 67.0], [-160.2, 65.7]] });
    var s2 = Math.max((bbox_layer_path2[1][0] - bbox_layer_path2[0][0]) / w, (bbox_layer_path2[1][1] - bbox_layer_path2[0][1]) / h);
    if (s2 < s1) bbox_layer_path = bbox_layer_path2;
  } else if (current_proj_name === 'Armadillo') {
    var _s = Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h);
    var _bbox_layer_path = path.bounds({ type: 'MultiPoint', coordinates: [[-69.3, -35.0], [20.9, -35.0], [147.2, -35.0], [175.0, 75.0], [-175.0, 75.0]] });
    var _s2 = Math.max((_bbox_layer_path[1][0] - _bbox_layer_path[0][0]) / w, (_bbox_layer_path[1][1] - _bbox_layer_path[0][1]) / h);
    if (_s2 < _s) bbox_layer_path = _bbox_layer_path;
  }
  return bbox_layer_path;
}

/**
* Change the projection scale and translate properties in order to fit the layer.
* Redraw the path from all the current layers to reflect the change.
*
* @param {string} name - The name of layer to scale on
* @return {undefined}
*/
function scale_to_lyr(name) {
  var bbox_layer_path = get_bbox_layer_path(name);
  if (!bbox_layer_path) return;
  s = 0.95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h) * proj.scale();
  t = [0, 0];
  proj.scale(s).translate(t);
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
}

/**
* Center and zoom to a layer (using zoom scale and translate properties).
* Projection properties stay unchanged.
*
* @param {string} name - The name of layer to zoom on
* @return {undefined}
*/
function center_map(name) {
  var bbox_layer_path = get_bbox_layer_path(name);
  var zoom_scale = .95 / Math.max((bbox_layer_path[1][0] - bbox_layer_path[0][0]) / w, (bbox_layer_path[1][1] - bbox_layer_path[0][1]) / h);
  var zoom_translate = [(w - zoom_scale * (bbox_layer_path[1][0] + bbox_layer_path[0][0])) / 2, (h - zoom_scale * (bbox_layer_path[1][1] + bbox_layer_path[0][1])) / 2];
  var _zoom = svg_map.__zoom;
  _zoom.k = zoom_scale;
  _zoom.x = zoom_translate[0];
  _zoom.y = zoom_translate[1];
}

function fitLayer(layer_name) {
  proj.scale(1).translate([0, 0]);
  var b = get_bbox_layer_path(layer_name);
  var s = 0.95 / Math.max((b[1][0] - b[0][0]) / w, (b[1][1] - b[0][1]) / h);
  var t = [(w - s * (b[1][0] + b[0][0])) / 2, (h - s * (b[1][1] + b[0][1])) / 2];
  proj.scale(s).translate(t);
  return [s, t];
}

function setSphereBottom(sphere_id) {
  var layers_list = document.querySelector('.layer_list');
  layers_list.appendChild(layers_list.childNodes[0]);
  svg_map.insertBefore(svg_map.querySelector('#' + sphere_id + '.layer'), svg_map.childNodes[0]);
  svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
}

function add_layout_feature(selected_feature) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (document.body.style.cursor === 'not-allowed') {
    return;
  }
  if (selected_feature === 'text_annot') {
    var existing_annotation = document.getElementsByClassName('txt_annot');
    var existing_id = [];
    var new_id = void 0;
    if (existing_annotation) {
      existing_id = Array.prototype.map.call(existing_annotation, function (elem) {
        return +elem.childNodes[0].id.split('text_annotation_')[1];
      });
    }
    for (var i = 0; i < 50; i++) {
      if (existing_id.indexOf(i) === -1) {
        existing_id.push(i);
        new_id = ['text_annotation_', i].join('');
        break;
      }
    }
    if (!new_id) {
      swal(i18next.t('app_page.common.error') + '!', i18next.t('app_page.common.error_max_text_annot'), 'error');
      return;
    }
    handleClickTextBox(new_id);
  } else if (selected_feature === 'sphere') {
    // if(current_layers.Sphere) return;
    var layer_to_add = check_layer_name(options.layer_name || 'Sphere');
    var layer_id = encodeId(layer_to_add);
    var fill = options.fill || '#add8e6';
    var fill_opacity = options.fill_opacity || 0.2;
    var stroke_width = options.stroke_width || '0.5px';
    var stroke_opacity = options.stroke_opacity || 1;
    var stroke = options.stroke || '#ffffff';
    _app.layer_to_id.set(layer_to_add, layer_id);
    _app.id_to_layer.set(layer_id, layer_to_add);
    current_layers[layer_to_add] = {
      sphere: true,
      type: 'Polygon',
      n_features: 1,
      'stroke-width-const': +stroke_width.slice(0, -2),
      fill_color: { single: fill }
    };
    map.append('g').attrs({ id: layer_id, class: 'layer' }).styles({ 'stroke-width': stroke_width }).append('path').datum({ type: 'Sphere' }).styles({ fill: fill, 'fill-opacity': fill_opacity, 'stroke-opacity': stroke_opacity, stroke: stroke }).attrs({ d: path });
    if (isInterrupted(current_proj_name.toLowerCase())) {
      map.select('g#' + layer_id).attr('clip-path', 'url(#clip)');
    }
    create_li_layer_elem(layer_to_add, null, 'Polygon', 'sample');
    alertify.notify(i18next.t('app_page.notification.success_sphere_added'), 'success', 5);
    zoom_without_redraw();
    setSphereBottom(layer_id);
  } else if (selected_feature === 'graticule') {
    if (current_layers.Graticule !== undefined) return;
    var _stroke = options.stroke || '#808080';
    var _stroke_width = options.stroke_width || '1px';
    var _stroke_opacity = options.stroke_opacity || 1;
    var stroke_dasharray = options.stroke_dasharray || 5;
    var step = options.step || 10;
    var graticule = d3.geoGraticule().step([step, step]);
    if (options.extent) {
      var bbox_layer = _target_layer_file.bbox;
      var extent = [[Math.round((bbox_layer[0] - 10) / 10) * 10, Math.round((bbox_layer[1] - 10) / 10) * 10], [Math.round((bbox_layer[2] + 10) / 10) * 10, Math.round((bbox_layer[3] + 10) / 10) * 10]];
      graticule = graticule.extent(extent);
      current_layers.Graticule.extent = extent;
    }
    var _layer_to_add = 'Graticule';
    var _layer_id = encodeId(_layer_to_add);
    _app.layer_to_id.set(_layer_to_add, _layer_id);
    _app.id_to_layer.set(_layer_id, _layer_to_add);
    map.insert('g', '.legend').attrs({ id: _layer_id, class: 'layer' }).styles({ 'stroke-width': _stroke_width }).append('path').datum(graticule).attrs({ d: path, class: 'graticule' }).styles({ 'stroke-dasharray': stroke_dasharray, fill: 'none', stroke: _stroke });
    current_layers.Graticule = {
      graticule: true,
      type: 'Line',
      n_features: 1,
      'stroke-width-const': +_stroke_width.slice(0, -2),
      fill_color: { single: _stroke },
      opacity: _stroke_opacity,
      step: step,
      dasharray: stroke_dasharray
    };
    if (isInterrupted(current_proj_name.toLowerCase())) {
      map.select('g#' + _layer_id).attr('clip-path', 'url(#clip)');
    }
    create_li_layer_elem('Graticule', null, 'Line', 'sample');
    alertify.notify(i18next.t('app_page.notification.success_graticule_added'), 'success', 5);
    up_legends();
    zoom_without_redraw();
  } else if (selected_feature === 'scale') {
    if (!scaleBar.displayed) {
      handleClickAddOther('scalebar');
    } else {
      ask_existing_feature('scalebar').then(function () {
        scaleBar.remove();
        handleClickAddOther('scalebar');
      }, function (dismiss) {
        return null;
      });
    }
  } else if (selected_feature === 'north_arrow') {
    if (!northArrow.displayed) {
      handleClickAddOther('north_arrow');
    } else {
      ask_existing_feature('north_arrow').then(function () {
        northArrow.remove();
        handleClickAddOther('north_arrow');
      }, function (dismiss) {
        return null;
      });
    }
  } else if (selected_feature === 'arrow') {
    handleClickAddArrow();
  } else if (selected_feature === 'ellipse') {
    handleClickAddEllipse();
  } else if (selected_feature === 'rectangle') {
    handleClickAddRectangle();
  } else if (selected_feature === 'symbol') {
    handleClickAddPicto();
  } else {
    swal(i18next.t('app_page.common.error') + '!', i18next.t('app_page.common.error'), 'error');
  }
}

// function handleCreateFreeDraw(){
//     let start_point,
//         tmp_start_point,
//         active_line,
//         drawing_data = { "lines": [] };
//
//     let render_line = d3.line().x(d => d[0]).y(d => d[1]);
//     let draw_calc = map.append("g")
//                         .append("rect")
//                         .attrs({class: "draw_calc", x: 0, y: 0, width: w, height: h})
//                         .style("opacity", 0.1).style("fill", "grey");
//
//     function redraw() {
//       var lines;
//       lines = draw_calc.selectAll('.line').data(drawing_data.lines);
//       lines.enter().append('path').attrs({
//         "class": 'line',
//         stroke: function(d) {
//           return d.color;
//         }
//       });
//       lines.attr("d", function(d) { return render_line(d.points);});
//       return lines.exit();
//     };
//
//     let drag = d3.drag()
//            .on('start', function() {
//               active_line = {
//                 points: [],
//                 color: "black"
//               };
//               drawing_data.lines.push(active_line);
//               return redraw();
//             })
//             .on('drag', function() {
//               active_line.points.push([d3.event.x, d3.event.y]);
//               console.log(drawing_data);
//               return redraw();
//             })
//             .on('end', function() {
//               if (active_line.points.length === 0) {
//                 drawing_data.lines.pop();
//               }
//               active_line = null;
//               console.log(drawing_data);
//               return;
//             });
//     zoom.on("zoom", null);
//     draw_calc.call(drag);
// }

function add_single_symbol(symbol_dataurl, x, y) {
  var width = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '30';
  var height = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '30';
  var symbol_id = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;

  var context_menu = new ContextMenu();
  var getItems = function getItems(self_parent) {
    return [{ name: i18next.t('app_page.common.options'), action: function action() {
        make_style_box_indiv_symbol(self_parent);
      } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
        up_legend(self_parent.parentElement);
      } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
        down_legend(self_parent.parentElement);
      } }, { name: i18next.t('app_page.common.delete'), action: function action() {
        self_parent.parentElement.remove();
      } }];
  };

  return map.append('g').attrs({ class: 'legend single_symbol', id: symbol_id }).insert('image').attrs({
    x: x || w / 2,
    y: y || h / 2,
    width: width,
    height: height,
    'xlink:href': symbol_dataurl }).on('mouseover', function () {
    this.style.cursor = 'pointer';
  }).on('mouseout', function () {
    this.style.cursor = 'initial';
  }).on('dblclick contextmenu', function () {
    context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
  }).call(drag_elem_geo);
}

function add_layout_layers() {
  check_remove_existing_box('.sampleLayoutDialogBox');
  var layout_layers = [[i18next.t('app_page.layout_layer_box.nuts0'), 'nuts0'], [i18next.t('app_page.layout_layer_box.nuts1'), 'nuts1'], [i18next.t('app_page.layout_layer_box.nuts2'), 'nuts2'], [i18next.t('app_page.layout_layer_box.brazil'), 'brazil'], [i18next.t('app_page.layout_layer_box.world_countries'), 'world_country'], [i18next.t('app_page.layout_layer_box.world_capitals'), 'world_cities'], [i18next.t('app_page.layout_layer_box.tissot'), 'tissot']];
  var selec = { layout: null };

  make_confirm_dialog2('sampleLayoutDialogBox', i18next.t('app_page.layout_layer_box.title')).then(function (confirmed) {
    if (confirmed) {
      if (selec.layout && selec.layout.length > 0) {
        for (var i = 0; i < selec.layout.length; ++i) {
          add_sample_geojson(selec.layout[i]);
        }
      }
    }
  });

  var box_body = d3.select('.sampleLayoutDialogBox').select('.modal-body').style('text-align', 'center');
  box_body.node().parentElement.style.width = 'auto';
  box_body.append('h3').html(i18next.t('app_page.layout_layer_box.msg_select_layer'));
  box_body.append('p').style('color', 'grey').html(i18next.t('app_page.layout_layer_box.msg_select_multi'));

  var layout_layer_selec = box_body.append('p').html('').insert('select').attrs({ class: 'sample_layout', multiple: 'multiple', size: layout_layers.length });
  layout_layers.forEach(function (layer_info) {
    layout_layer_selec.append('option').html(layer_info[0]).attr('value', layer_info[1]);
  });
  layout_layer_selec.on('change', function () {
    var selected_asArray = Array.prototype.slice.call(this.selectedOptions);
    selec.layout = selected_asArray.map(function (elem) {
      return elem.value;
    });
  });
  box_body.append('span').style('font-size', '0.65rem').html(i18next.t('app_page.layout_layer_box.disclamer_nuts'));
}

function add_sample_layer() {
  var prepare_extra_dataset_availables = function prepare_extra_dataset_availables() {
    request_data('GET', 'extrabasemaps').then(function (result) {
      _app.list_extrabasemaps = JSON.parse(result.target.responseText).filter(function (elem) {
        return elem[0] !== 'Tunisia';
      });
    });
  };
  check_remove_existing_box('.sampleDialogBox');
  if (!_app.list_extrabasemaps) {
    prepare_extra_dataset_availables();
  }
  var fields_type_sample = new Map([['GrandParisMunicipalities', [{ "name": "DEP", "type": "category", "has_duplicate": true }, { "name": "IDCOM", "type": "id" }, { "name": "EPT", "type": "category", "has_duplicate": true }, { "name": "INC", "type": "stock" }, { "name": "LIBCOM", "type": "id" }, { "name": "LIBEPT", "type": "category", "has_duplicate": true }, { "name": "TH", "type": "stock" }, { "name": "UID", "type": "id" }, { "name": "IncPerTH", "type": "ratio" }]], ['martinique', [{ "name": "INSEE_COM", "type": "id" }, { "name": "NOM_COM", "type": "id", "not_number": true }, { "name": "STATUT", "type": "category", "has_duplicate": true }, { "name": "SUPERFICIE", "type": "stock" }, { "name": "P13_POP", "type": "stock" }, { "name": "P13_LOG", "type": "stock" }, { "name": "P13_LOGVAC", "type": "stock" }, { "name": "Part_Logements_Vacants", "type": "ratio" }]], ['nuts2-2013-data', [{ "name": "id", "type": "id", "not_number": true }, { "name": "name", "type": "id", "not_number": true }, { "name": "POP", "type": "stock" }, { "name": "GDP", "type": "stock" }, { "name": "UNEMP", "type": "ratio" }, { "name": "COUNTRY", "type": "category", "has_duplicate": true }]], ['brazil', [{ "name": "ADMIN_NAME", "type": "id", "not_number": true }, { "name": "Abbreviation", "type": "id", "not_number": true }, { "name": "Capital", "type": "id", "not_number": true }, { "name": "GDP_per_capita_2012", "type": "stock" }, { "name": "Life_expectancy_2014", "type": "ratio" }, { "name": "Pop2014", "type": "stock" }, { "name": "REGIONS", "type": "category", "has_duplicate": true }, { "name": "STATE2010", "type": "id" }, { "name": "popdensity2014", "type": "ratio" }]], ['world_countries_data', [{ "name": "ISO2", "type": "id", "not_number": true }, { "name": "ISO3", "type": "id", "not_number": true }, { "name": "ISONUM", "type": "id" }, { "name": "NAMEen", "type": "id", "not_number": true }, { "name": "NAMEfr", "type": "id", "not_number": true }, { "name": "UNRegion", "type": "category", "has_duplicate": true }, { "name": "GrowthRate", "type": "ratio" }, { "name": "PopDensity", "type": "ratio" }, { "name": "PopTotal", "type": "stock" }, { "name": "JamesBond", "type": "stock" }]]]);
  var suggested_projection = new Map([['GrandParisMunicipalities', ['proj4', '+proj=lcc +lat_1=48.25 +lat_2=49.75 +lat_0=49 +lon_0=3 +x_0=1700000 +y_0=8200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs']], ['martinique', ['proj4', '+proj=utm +zone=20 +ellps=intl +towgs84=186,482,151,0,0,0,0 +units=m +no_defs']], ['nuts2-2013-data', ['proj4', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs']], ['brazil', ['proj4', '+proj=longlat +ellps=aust_SA +towgs84=-67.35,3.88,-38.22,0,0,0,0 +no_defs']], ['world_countries_data', ['d3', 'NaturalEarth2']]]);
  var target_layers = [[i18next.t('app_page.sample_layer_box.target_layer'), ''], [i18next.t('app_page.sample_layer_box.grandparismunicipalities'), 'GrandParisMunicipalities'], [i18next.t('app_page.sample_layer_box.martinique'), 'martinique'], [i18next.t('app_page.sample_layer_box.nuts2_data'), 'nuts2-2013-data'], [i18next.t('app_page.sample_layer_box.brazil'), 'brazil'], [i18next.t('app_page.sample_layer_box.world_countries'), 'world_countries_data']];
  var dialog_res = [];
  var selec = void 0,
      selec_url = void 0,
      content = void 0;

  make_confirm_dialog2('sampleDialogBox', i18next.t('app_page.sample_layer_box.title')).then(function (confirmed) {
    if (confirmed) {
      if (content.attr('id') === 'panel1') {
        if (selec) {
          add_sample_geojson(selec, {
            target_layer_on_add: true,
            fields_type: fields_type_sample.get(selec),
            default_projection: suggested_projection.get(selec)
          });
        }
      } else if (content.attr('id') === 'panel2') {
        var formToSend = new FormData();
        formToSend.append('url', selec_url[1]);
        formToSend.append('layer_name', selec_url[0]);
        xhrequest('POST', '/convert_extrabasemap', formToSend, true).then(function (data) {
          add_layer_topojson(data, { target_layer_on_add: true });
        }, function (error) {
          display_error_during_computation();
        });
      }
    }
  });

  function make_panel2() {
    box_body.selectAll('div').remove();
    content = box_body.append('div').attr('id', 'panel2');
    content.append('h3').html(i18next.t('app_page.sample_layer_box.subtitle1'));
    content.append('p').append('span').html(i18next.t('app_page.sample_layer_box.extra_basemaps_info'));
    var select_extrabasemap = content.append('p').insert('select').on('change', function () {
      var id_elem = this.value;
      selec_url = [_app.list_extrabasemaps[id_elem][0], _app.list_extrabasemaps[id_elem][1], id_elem];
    });
    for (var i = 0, len_i = _app.list_extrabasemaps.length; i < len_i; i++) {
      select_extrabasemap.append('option').attr('value', i).html(_app.list_extrabasemaps[i][0]);
    }
    content.append('p').styles({ margin: 'auto', 'text-align': 'right', cursor: 'pointer' }).append('span').html(i18next.t('app_page.sample_layer_box.back_sample')).on('click', function () {
      make_panel1();
    });
    if (selec_url) {
      setSelected(select_extrabasemap.node(), selec_url[2]);
    } else {
      selec_url = [_app.list_extrabasemaps[0][0], _app.list_extrabasemaps[0][1], 0];
    }
    content.select('#link1').on('click', function () {
      window.open('http://www.naturalearthdata.com', 'Natural Earth', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
    });
    content.select('#link2').on('click', function () {
      window.open('https://github.com/riatelab/basemaps/tree/master/Countries', 'riatelab/basemaps', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
    });
  }

  function make_panel1() {
    box_body.selectAll('div').remove();
    content = box_body.append('div').attr('id', 'panel1');
    content.append('h3').html(i18next.t('app_page.sample_layer_box.subtitle1'));

    var t_layer_selec = content.append('p').html('').insert('select').attr('class', 'sample_target');
    target_layers.forEach(function (layer_info) {
      t_layer_selec.append('option').html(layer_info[0]).attr('value', layer_info[1]);
    });
    t_layer_selec.on('change', function () {
      selec = this.value;
    });
    content.append('p').styles({ margin: 'auto', 'text-align': 'right', cursor: 'pointer' }).append('span').html(i18next.t('app_page.sample_layer_box.more_basemaps')).on('click', function () {
      make_panel2();
    });
    if (selec) setSelected(t_layer_selec.node(), selec);
  }

  var box_body = d3.select('.sampleDialogBox').select('.modal-body');
  setTimeout(function (_) {
    document.querySelector('select.sample_target').focus();
  }, 500);
  make_panel1();
}

function add_simplified_land_layer() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var skip_rescale = options.skip_rescale || false;
  var stroke = options.stroke || 'rgb(0,0,0)';
  var fill = options.fill || '#d3d3d3';
  var stroke_opacity = options.stroke_opacity || 0.0;
  var fill_opacity = options.fill_opacity || 0.75;
  var stroke_width = options.stroke_width || '0.3px';
  var visible = !(options.visible === false);
  var drop_shadow = options.drop_shadow || false;

  var world_id = encodeId('World');
  _app.layer_to_id.set('World', world_id);
  _app.id_to_layer.set(world_id, 'World');
  current_layers.World = {
    type: 'Polygon',
    n_features: 125,
    'stroke-width-const': +stroke_width.slice(0, -2),
    fill_color: { single: fill }
  };
  map.insert('g', '.legend').attrs({ id: world_id, class: 'layer', 'clip-path': 'url(#clip)' }).style('stroke-width', stroke_width).selectAll('.subunit').data(topojson.feature(world_topology, world_topology.objects.World).features).enter().append('path').attr('d', path).styles({
    stroke: stroke,
    fill: fill,
    'stroke-opacity': stroke_opacity,
    'fill-opacity': fill_opacity
  });
  create_li_layer_elem('World', null, 'Polygon', 'sample');
  if (drop_shadow) {
    createDropShadow('World');
  }
  if (!skip_rescale) {
    scale_to_lyr('World');
    center_map('World');
  }
  if (!visible) {
    handle_active_layer('World');
  }
  zoom_without_redraw();
}

function add_sample_geojson(name, options) {
  var formToSend = new FormData();
  formToSend.append('layer_name', name);
  xhrequest('POST', 'sample', formToSend, true).then(function (data) {
    add_layer_topojson(data, options);
  }).catch(function (err) {
    display_error_during_computation();
    console.log(err);
  });
}

function send_remove_server(layer_name) {
  var formToSend = new FormData();
  formToSend.append('layer_name', current_layers[layer_name].key_name);
  xhrequest('POST', 'layers/delete', formToSend, true).then(function (data) {
    var parsed = JSON.parse(data);
    if (!parsed.code || parsed.code !== 'Ok') console.log(data);
  }).catch(function (err) {
    console.log(err);
  });
}

/**
* Return the x and y position where the svg element is located
* in the browser window.
*
* @return {Object} - An object with x and y properties.
*/
function get_map_xy0() {
  var bbox = svg_map.getBoundingClientRect();
  return { x: bbox.left, y: bbox.top };
}

var getIdLayoutFeature = function getIdLayoutFeature(type) {
  var class_name = void 0,
      id_prefix = void 0,
      error_name = void 0;
  if (type === 'ellipse') {
    class_name = 'user_ellipse';
    id_prefix = 'user_ellipse_';
    error_name = 'error_max_ellipses';
  } else if (type === 'rectangle') {
    class_name = 'user_rectangle';
    id_prefix = 'user_rectangle_';
    error_name = 'error_max_rectangles';
  } else if (type === 'arrow') {
    class_name = 'arrow';
    id_prefix = 'arrow_';
    error_name = 'error_max_arrows';
  } else if (type === 'single_symbol') {
    class_name = 'single_symbol';
    id_prefix = 'single_symbol_';
    error_name = 'error_max_symbols';
  }
  var features = document.getElementsByClassName(class_name);
  if (!features) {
    return 0;
  } else if (features.length > 30) {
    swal(i18next.t('app_page.common.error'), i18next.t('app_page.common.' + error_name), 'error').catch(swal.noop);
    return null;
  }
  var ids = [];
  for (var i = 0; i < features.length; i++) {
    ids.push(+features[i].id.split(id_prefix)[1]);
  }
  if (ids.indexOf(features.length) === -1) {
    return features.length;
  }
  for (var _i2 = 0; _i2 < features.length; _i2++) {
    if (ids.indexOf(_i2) === -1) {
      return _i2;
    }
  }
  return null;
};

function handleClickAddRectangle() {
  var rectangle_id = getIdLayoutFeature('rectangle');
  if (rectangle_id === null) {
    return;
  }
  var start_point = void 0,
      tmp_start_point = void 0;
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map'), 'warning', 0);
  document.body.style.cursor = 'not-allowed';
  map.style('cursor', 'crosshair').on('click', function () {
    msg.dismiss();
    start_point = [d3.event.layerX, d3.event.layerY];
    tmp_start_point = map.append('rect').attrs({ x: start_point[0] - 2, y: start_point[1] - 2, height: 4, width: 4 }).style('fill', 'red');
    setTimeout(function () {
      tmp_start_point.remove();
    }, 1000);
    map.style('cursor', '').on('click', null);
    document.body.style.cursor = '';
    new UserRectangle('user_rectangle_' + rectangle_id, start_point, svg_map);
  });
}

function handleClickAddOther(type) {
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map'), 'warning', 0);
  document.body.style.cursor = 'not-allowed';
  map.style('cursor', 'crosshair').on('click', function () {
    msg.dismiss();
    map.style('cursor', '').on('click', null);
    document.body.style.cursor = '';
    if (type === 'north_arrow') {
      northArrow.display(d3.event.layerX, d3.event.layerY);
    } else if (type === 'scalebar') {
      scaleBar.create(d3.event.layerX, d3.event.layerY);
    }
  });
}

function handleClickAddEllipse() {
  var ellipse_id = getIdLayoutFeature('ellipse');
  if (ellipse_id === null) {
    return;
  }
  document.body.style.cursor = 'not-allowed';
  var start_point = void 0,
      tmp_start_point = void 0;
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map'), 'warning', 0);
  map.style('cursor', 'crosshair').on('click', function () {
    msg.dismiss();
    start_point = [d3.event.layerX, d3.event.layerY];
    tmp_start_point = map.append('rect').attrs({ x: start_point[0] - 2, y: start_point[1] - 2, height: 4, width: 4 }).style('fill', 'red');
    setTimeout(function () {
      tmp_start_point.remove();
    }, 1000);
    map.style('cursor', '').on('click', null);
    document.body.style.cursor = '';
    new UserEllipse('user_ellipse_' + ellipse_id, start_point, svg_map);
  });
}

function handleClickTextBox(text_box_id) {
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map'), 'warning', 0);
  document.body.style.cursor = 'not-allowed';
  map.style('cursor', 'crosshair').on('click', function () {
    msg.dismiss();
    map.style('cursor', '').on('click', null);
    document.body.style.cursor = '';
    var text_box = new Textbox(svg_map, text_box_id, [d3.event.layerX, d3.event.layerY]);
    setTimeout(function () {
      text_box.editStyle();
    }, 350);
  });
}

function handleClickAddPicto() {
  var symbol_id = getIdLayoutFeature('single_symbol');
  if (symbol_id === null) {
    return;
  }
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map'), 'warning', 0);
  var map_point = void 0,
      click_pt = void 0,
      prep_symbols = void 0,
      available_symbols = false;

  if (!window.default_symbols) {
    window.default_symbols = [];
    prep_symbols = prepare_available_symbols();
  } else {
    available_symbols = true;
  }

  document.body.style.cursor = 'not-allowed';
  map.style('cursor', 'crosshair').on('click', function () {
    msg.dismiss();
    click_pt = [d3.event.layerX, d3.event.layerY];
    map_point = map.append('rect').attrs({ x: click_pt[0] - 2, y: click_pt[1] - 2, height: 4, width: 4 }).style('fill', 'red');
    setTimeout(function () {
      map_point.remove();
    }, 500);
    map.style('cursor', '').on('click', null);
    document.body.style.cursor = '';
    if (!available_symbols) {
      prep_symbols.then(function (confirmed) {
        box_choice_symbol(window.default_symbols).then(function (result) {
          if (result) {
            add_single_symbol(result.split('url(')[1].substring(1).slice(0, -2), click_pt[0], click_pt[1], 45, 45, 'single_symbol_' + symbol_id);
          }
        });
      });
    } else {
      box_choice_symbol(window.default_symbols).then(function (result) {
        if (result) {
          add_single_symbol(result.split('url(')[1].substring(1).slice(0, -2), click_pt[0], click_pt[1], 45, 45, 'single_symbol_' + symbol_id);
        }
      });
    }
  });
}

// function handleFreeDraw(){
//     var line_gen = d3.line(d3.curveBasis);
//     var draw_layer = map.select('#_m_free_draw_layer');
//     if(!draw_layer.node()){
//         draw_layer = map.append('g').attrs({id: "_m_free_draw_layer"});
//     } else {
//         // up the draw_layer ?
//     }
//     var draw_rect = draw_layer.append('rect')
//         .attrs({fill: 'transparent', height: h, width: w, x: 0, y:0});
//     draw_layer.call(d3.drag()
//         .container(function(){ return this; })
//         .subject(_ =>  [[d3.event.x, d3.event.y], [d3.event.x, d3.event.y]])
//         .on('start', _ => {
//             handle_click_hand('lock');
//             let d = d3.event.subject,
//                 active_line = draw_layer.append('path').datum(d),
//                 x0 = d3.event.x,
//                 y0 = d3.event.y;
//             d3.event.on('drag', function(){
//                 var x1 = d3.event.x,
//                     y1 = d3.event.y,
//                     dx = x1 - x0,
//                     dy = y1 - y0;
//                 if(dx * dx + dy * dy > 100) d.push([x0 = x1, y0 = y1]);
//                 else d[d.length -1] = [x1, y1];
//                 active_line.attr('d', line_gen)
//             });
//         }));
// }

function handleClickAddArrow() {
  var arrow_id = getIdLayoutFeature('arrow');
  if (arrow_id === null) {
    return;
  }
  var start_point = void 0,
      tmp_start_point = void 0,
      end_point = void 0,
      tmp_end_point = void 0;
  document.body.style.cursor = 'not-allowed';
  var msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map_arrow1'), 'warning', 0);
  map.style('cursor', 'crosshair').on('click', function () {
    if (!start_point) {
      start_point = [d3.event.layerX, d3.event.layerY];
      tmp_start_point = map.append('rect').attrs({ x: start_point[0] - 2, y: start_point[1] - 2, height: 4, width: 4 }).style('fill', 'red');
      msg.dismiss();
      msg = alertify.notify(i18next.t('app_page.notification.instruction_click_map_arrow2'), 'warning', 0);
    } else {
      end_point = [d3.event.layerX, d3.event.layerY];
      tmp_end_point = map.append('rect').attrs({ x: end_point[0] - 2, y: end_point[1] - 2, height: 4, width: 4 }).style('fill', 'red');
    }
    if (start_point && end_point) {
      msg.dismiss();
      setTimeout(function () {
        tmp_start_point.remove();
        tmp_end_point.remove();
      }, 1000);
      map.style('cursor', '').on('click', null);
      document.body.style.cursor = '';
      new UserArrow('arrow_' + arrow_id, start_point, end_point, svg_map);
    }
  });
}

function prepare_available_symbols() {
  return xhrequest('GET', 'static/json/list_symbols.json', null).then(function (result) {
    var list_res = JSON.parse(result);
    return Promise.all(list_res.map(function (name) {
      return getImgDataUrl('static/img/svg_symbols/' + name);
    })).then(function (symbols) {
      for (var i = 0; i < list_res.length; i++) {
        default_symbols.push([list_res[i], symbols[i]]);
      }
    });
  });
}

function accordionize() {
  var css_selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.accordion';
  var parent = arguments[1];

  var _parent = parent && (typeof parent === 'undefined' ? 'undefined' : _typeof(parent)) === 'object' ? parent : parent && typeof parent === 'string' ? document.querySelector(parent) : document;
  var acc = _parent.querySelectorAll(css_selector);
  for (var i = 0; i < acc.length; i++) {
    acc[i].onclick = function () {
      var opened = _parent.querySelector(css_selector + '.active');
      if (opened) {
        opened.classList.toggle('active');
        opened.nextElementSibling.classList.toggle('show');
      }
      if (!opened || opened.id !== this.id) {
        this.classList.toggle('active');
        this.nextElementSibling.classList.toggle('show');
      }
    };
  }
}

function accordionize2() {
  var css_selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.accordion';
  var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;

  var acc = parent.querySelectorAll(css_selector);
  for (var i = 0; i < acc.length; i++) {
    acc[i].onclick = function () {
      this.classList.toggle('active');
      this.nextElementSibling.classList.toggle('show');
    };
  }
}
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function handleJoin() {
  var layer_name = Object.getOwnPropertyNames(user_data);

  if (!(layer_name.length === 1 && joined_dataset.length === 1)) {
    swal('', i18next.t('app_page.join_box.unable_join'), 'error');
  } else if (field_join_map.length !== 0) {
    make_confirm_dialog2('dialogBox', undefined, { html_content: i18next.t('app_page.join_box.ask_forget_join') }).then(function (confirmed) {
      if (confirmed) {
        valid_join_check_display();
        field_join_map = [];
        removeExistingJointure(layer_name);
        createJoinBox(layer_name[0]);
      }
    });
  } else if (user_data[layer_name].length !== joined_dataset[0].length) {
    make_confirm_dialog2('dialogBox', undefined, { html_content: i18next.t('app_page.join_box.ask_diff_nb_features') }).then(function (confirmed) {
      if (confirmed) {
        createJoinBox(layer_name[0]);
      }
    });
  } else {
    createJoinBox(layer_name[0]);
  }
}

/**
* Function called to update the menu according to user operation
* (triggered when layers/dataset are added and after a join operation)
* @param {bool} val - ...
* @param {Array} prop - The proportion of joined features
* @return {void}
*/
function valid_join_check_display(val, prop) {
  if (!val) {
    var extDatasetImg = document.getElementById('img_data_ext');
    extDatasetImg.setAttribute('src', '/static/img/b/joinfalse.png');
    extDatasetImg.setAttribute('alt', 'Non-validated join');
    extDatasetImg.style.width = '28px';
    extDatasetImg.style.height = '28px';
    extDatasetImg.onclick = handleJoin;

    var joinSec = document.getElementById('join_section');
    joinSec.innerHTML = [prop, i18next.t('app_page.join_box.state_not_joined')].join('');

    var button = document.createElement('button');
    button.setAttribute('id', 'join_button');
    button.style.display = 'inline';
    button.innerHTML = '<button style="font-size: 11px;" class="button_st3" id="_join_button">' + i18next.t('app_page.join_box.button_join') + '</button>';
    button.onclick = handleJoin;
    joinSec.appendChild(button);
  } else {
    var _extDatasetImg = document.getElementById('img_data_ext');
    _extDatasetImg.setAttribute('src', '/static/img/b/jointrue.png');
    _extDatasetImg.setAttribute('alt', 'Validated join');
    _extDatasetImg.style.width = '28px';
    _extDatasetImg.style.height = '28px';
    _extDatasetImg.onclick = null;

    var _prop$split$map = prop.split('/').map(function (d) {
      return +d;
    }),
        _prop$split$map2 = _slicedToArray(_prop$split$map, 2),
        v1 = _prop$split$map2[0],
        _ = _prop$split$map2[1];

    var _joinSec = document.getElementById('join_section');
    _joinSec.innerHTML = [' <b>', prop, i18next.t('app_page.join_box.match', { count: v1 }), '</b>'].join(' ');

    var _button = document.createElement('button');
    _button.setAttribute('id', 'join_button');
    _button.style.display = 'inline';
    _button.innerHTML = [' - <i> ', i18next.t('app_page.join_box.change_field'), ' </i>'].join('');
    _button.onclick = handleJoin;
    _joinSec.appendChild(_button);
  }
}

// Where the real join is done
// Its two main results are:
//    -the update of the global "field_join_map" array
//       (storing the relation between index of the geometry
//         layer and index of the external dataset)
//    -the update of the global "user_data" object, adding actualy the value
//     to each object representing each feature of the layer
function valid_join_on(layer_name, field1, field2) {
  var join_values1 = [],
      join_values2 = [];
  var hits = 0,
      val = void 0;

  field_join_map = [];

  for (var i = 0, len = joined_dataset[0].length; i < len; i++) {
    join_values2.push(joined_dataset[0][i][field2]);
  }
  for (var _i = 0, _len = user_data[layer_name].length; _i < _len; _i++) {
    join_values1.push(user_data[layer_name][_i][field1]);
  }

  if (has_duplicate(join_values1) || has_duplicate(join_values2)) {
    return swal('', i18next.t('app_page.join_box.error_not_uniques'), 'warning');
  }

  if (typeof join_values1[0] === 'number' && typeof join_values2[0] === 'string') {
    for (var _i2 = 0, _len2 = join_values1.length; _i2 < _len2; _i2++) {
      val = join_values2.indexOf(String(join_values1[_i2]));
      if (val !== -1) {
        field_join_map.push(val);
        hits += 1;
      } else {
        field_join_map.push(undefined);
      }
    }
  } else if (typeof join_values2[0] === 'number' && typeof join_values1[0] === 'string') {
    for (var _i3 = 0, _len3 = join_values1.length; _i3 < _len3; _i3++) {
      val = join_values2.indexOf(Number(join_values1[_i3]));
      if (val !== -1) {
        field_join_map.push(val);
        hits += 1;
      } else {
        field_join_map.push(undefined);
      }
    }
  } else if (typeof join_values2[0] === 'number' && typeof join_values1[0] === 'number') {
    for (var _i4 = 0, _len4 = join_values1.length; _i4 < _len4; _i4++) {
      val = join_values2.indexOf(join_values1[_i4]);
      if (val !== -1) {
        field_join_map.push(val);
        hits += 1;
      } else {
        field_join_map.push(undefined);
      }
    }
  } else {
    for (var _i5 = 0, _len5 = join_values1.length; _i5 < _len5; _i5++) {
      val = join_values2.indexOf(String(join_values1[_i5]));
      if (val !== -1) {
        field_join_map.push(val);
        hits += 1;
      } else {
        field_join_map.push(undefined);
      }
    }
  }

  var prop = [hits, '/', join_values1.length].join('');
  var f_name = '';

  if (hits === join_values1.length) {
    swal({ title: '',
      text: i18next.t('app_page.common.success'),
      type: 'success',
      allowOutsideClick: true });
    var fields_name_to_add = Object.getOwnPropertyNames(joined_dataset[0][0]);
    for (var _i6 = 0, _len6 = join_values1.length; _i6 < _len6; _i6++) {
      val = field_join_map[_i6];
      for (var j = 0, leng = fields_name_to_add.length; j < leng; j++) {
        f_name = fields_name_to_add[j];
        if (f_name.length > 0) {
          user_data[layer_name][_i6][f_name] = joined_dataset[0][val][f_name];
        }
      }
    }
    valid_join_check_display(true, prop);
    return Promise.resolve(true);
  } else if (hits > 0) {
    return swal({
      title: i18next.t('app_page.common.confirm') + '!',
      text: i18next.t('app_page.join_box.partial_join', { ratio: prop }),
      allowOutsideClick: false,
      allowEscapeKey: true,
      type: 'question',
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: i18next.t('app_page.common.yes'),
      cancelButtonText: i18next.t('app_page.common.no')
    }).then(function () {
      var fields_name_to_add = Object.getOwnPropertyNames(joined_dataset[0][0]);
      for (var _i7 = 0, _len7 = field_join_map.length; _i7 < _len7; _i7++) {
        val = field_join_map[_i7];
        for (var _j = 0, _leng = fields_name_to_add.length; _j < _leng; _j++) {
          f_name = fields_name_to_add[_j];
          if (f_name.length > 0) {
            var t_val = void 0;
            if (val == undefined) t_val = null; // eslint-disable-line
            else if (joined_dataset[0][val][f_name] === '') t_val = null;else t_val = joined_dataset[0][val][f_name];
            user_data[layer_name][_i7][f_name] = val != undefined ? joined_dataset[0][val][f_name] : null; // eslint-disable-line
          }
        }
      }
      valid_join_check_display(true, prop);
      return Promise.resolve(true);
    }, function (dismiss) {
      field_join_map = [];
      return Promise.resolve(false);
    });
  }
  swal('', i18next.t('app_page.join_box.no_match', { field1: field1, field2: field2 }), 'error');
  field_join_map = [];
  return Promise.resolve(false);
}

// Function creating the join box , filled by to "select" input linked one to
// the geometry layer and the other to the external dataset, in order to choose
// the common field to do the join.
var createJoinBox = function createJoinBox(layer) {
  var geom_layer_fields = [].concat(_toConsumableArray(current_layers[layer].original_fields.keys()));
  var ext_dataset_fields = Object.getOwnPropertyNames(joined_dataset[0][0]);
  var button1 = ['<select id=button_field1>'];
  var button2 = ['<select id=button_field2>'];
  var lastChoice = { field1: geom_layer_fields[0], field2: ext_dataset_fields[0] };

  for (var i = 0, len = geom_layer_fields.length; i < len; i++) {
    button1.push(['<option value="', geom_layer_fields[i], '">', geom_layer_fields[i], '</option>'].join(''));
  }
  button1.push('</select>');

  for (var _i8 = 0, _len8 = ext_dataset_fields.length; _i8 < _len8; _i8++) {
    if (ext_dataset_fields[_i8].length > 0) {
      button2.push(['<option value="', ext_dataset_fields[_i8], '">', ext_dataset_fields[_i8], '</option>'].join(''));
    }
  }
  button2.push('</select>');

  var inner_box = ['<p><b><i>', i18next.t('app_page.join_box.select_fields'), '</i></b></p>', '<div style="padding:10px"><p>', i18next.t('app_page.join_box.geom_layer_field'), '</p>', button1.join(''), '<em style="float:right;">(', layer, ')</em></div>', '<div style="padding:15px 10px 10px"><p>', i18next.t('app_page.join_box.ext_dataset_field'), '<br></p>', button2.join(''), '<em style="float:right;">(', dataset_name, '.csv)</em></div>', '<br><p><strong>', i18next.t('app_page.join_box.ask_join'), '<strong></p></div>'].join('');

  make_confirm_dialog2('joinBox', i18next.t('app_page.join_box.title'), { html_content: inner_box, widthFitContent: true }).then(function (confirmed) {
    if (confirmed) {
      valid_join_on(layer, lastChoice.field1, lastChoice.field2).then(function (valid) {
        if (valid) make_box_type_fields(layer);
      });
    }
  });

  d3.select('.joinBox').styles({ 'text-align': 'center', 'line-height': '0.9em' });
  d3.select('#button_field1').style('float', 'left').on('change', function () {
    lastChoice.field1 = this.value;
  });
  d3.select('#button_field2').style('float', 'left').on('change', function () {
    lastChoice.field2 = this.value;
  });
};

var removeExistingJointure = function removeExistingJointure(layer_name) {
  if (!user_data[layer_name] || user_data[layer_name].length < 1) return;
  var dataLayer = user_data[layer_name];
  var original_fields = current_layers[layer_name].original_fields;
  var fieldDifference = Object.getOwnPropertyNames(dataLayer[0]).filter(function (f) {
    return !original_fields.has(f);
  });
  var nbFields = fieldDifference.length;
  for (var i = 0, nbFt = dataLayer.length; i < nbFt; i++) {
    for (var j = 0; j < nbFields; j++) {
      delete dataLayer[i][fieldDifference[j]];
    }
  }
};
'use strict';

/**
* Function to dispatch the click on the "open style box" icon
* to the actual appropriate function according to the type of the layer.
*
* @param {String} layer_name - The name of the layer.
* @return {void} - Nothing is returned but the "style box" should open.
*
*/

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function handle_click_layer(layer_name) {
  if (current_layers[layer_name].graticule) {
    createStyleBoxGraticule();
  } else if (current_layers[layer_name].type === 'Line') {
    createStyleBox_Line(layer_name);
  } else if (current_layers[layer_name].renderer && current_layers[layer_name].renderer.indexOf('PropSymbol') > -1) {
    createStyleBox_ProbSymbol(layer_name);
  } else if (current_layers[layer_name].renderer && current_layers[layer_name].renderer === 'Label') {
    createStyleBoxLabel(layer_name);
  } else if (current_layers[layer_name].renderer && current_layers[layer_name].renderer === 'TypoSymbols') {
    createStyleBoxTypoSymbols(layer_name);
  } else if (current_layers[layer_name].renderer && current_layers[layer_name].renderer === 'TwoStocksWaffle') {
    createStyleBoxWaffle(layer_name);
  } else if (current_layers[layer_name].renderer === 'Stewart') {
    createStyleBoxStewart(layer_name);
  } else {
    createStyleBox(layer_name);
  }
}

function make_single_color_menu(layer, fill_prev) {
  var symbol = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'path';

  var fill_color_section = d3.select('#fill_color_section'),
      g_lyr_name = '#' + _app.layer_to_id.get(layer),
      last_color = fill_prev && fill_prev.single ? fill_prev.single : '#FFF';
  var block = fill_color_section.insert('p');
  block.insert('span').html(i18next.t('app_page.layer_style_popup.fill_color'));
  block.insert('input').style('float', 'right').attrs({ type: 'color', value: last_color }).on('change', function () {
    map.select(g_lyr_name).selectAll(symbol).transition().style('fill', this.value);
    current_layers[layer].fill_color = { single: this.value };
  });
  map.select(g_lyr_name).selectAll(symbol).transition().style('fill', last_color);
  current_layers[layer].fill_color = { single: last_color };
}

function make_random_color(layer) {
  var symbol = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'path';

  var block = d3.select('#fill_color_section');
  block.selectAll('span').remove();
  block.insert('span').styles({ cursor: 'pointer', 'text-align': 'center' }).html(i18next.t('app_page.layer_style_popup.toggle_colors')).on('click', function (d, i) {
    map.select('#' + _app.layer_to_id.get(layer)).selectAll(symbol).transition().style('fill', function () {
      return Colors.names[Colors.random()];
    });
    current_layers[layer].fill_color = { random: true };
    make_random_color(layer, symbol);
  });
  map.select('#' + _app.layer_to_id.get(layer)).selectAll(symbol).transition().style('fill', function () {
    return Colors.names[Colors.random()];
  });
  current_layers[layer].fill_color = { random: true };
}

function fill_categorical(layer, field_name, symbol, color_cat_map) {
  map.select('#' + _app.layer_to_id.get(layer)).selectAll(symbol).transition().style('fill', function (d) {
    return color_cat_map.get(d.properties[field_name]);
  });
}

function make_categorical_color_menu(fields, layer, fill_prev) {
  var symbol = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'path';

  var fill_color_section = d3.select('#fill_color_section').append('p');
  fill_color_section.insert('span').html(i18next.t('app_page.layer_style_popup.categorical_field'));
  var field_selec = fill_color_section.insert('select');
  fields.forEach(function (field) {
    if (field !== 'id') field_selec.append('option').text(field).attr('value', field);
  });
  if (fill_prev.categorical && fill_prev.categorical instanceof Array) {
    setSelected(field_selec.node(), fill_prev.categorical[0]);
  }
  field_selec.on('change', function () {
    var field_name = this.value,
        data_layer = current_layers[layer].is_result ? result_data[layer] : user_data[layer],
        values = data_layer.map(function (i) {
      return i[field_name];
    }),
        cats = new Set(values),
        txt = [cats.size, ' cat.'].join('');
    d3.select('#nb_cat_txt').html(txt);
    var color_cat_map = new Map();
    Array.from(cats.keys()).forEach(function (val) {
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
  var section = parent.insert('p').attr('class', 'inp_bottom');
  section.append('span').html(i18next.t('app_page.layer_style_popup.layer_name'));
  var inpt = section.append('input').attrs({ id: 'lyr_change_name', type: 'text' }).styles({ width: '200px', float: 'left' });
  inpt.node().value = layer_name;
  return inpt;
}

function createStyleBoxTypoSymbols(layer_name) {
  function get_prev_settings() {
    var features = selection._groups[0];
    for (var i = 0; i < features.length; i++) {
      prev_settings.push({
        display: features[i].style.display ? features[i].style.display : null,
        size: features[i].getAttribute('width'),
        position: [features[i].getAttribute('x'), features[i].getAttribute('y')]
      });
    }
    prev_settings_defaults.size = current_layers[layer_name].default_size;
  }

  var restore_prev_settings = function restore_prev_settings() {
    var features = selection._groups[0];
    for (var i = 0; i < features.length; i++) {
      features[i].setAttribute('width', prev_settings[i].size);
      features[i].setAttribute('height', prev_settings[i].size);
      features[i].setAttribute('x', prev_settings[i].position[0]);
      features[i].setAttribute('y', prev_settings[i].position[1]);
      features[i].style.display = prev_settings[i].display;
    }
    current_layers[layer_name].default_size = prev_settings_defaults.size;
  };

  check_remove_existing_box('.styleBox');

  var selection = map.select('#' + _app.layer_to_id.get(layer_name)).selectAll('image'),
      ref_layer_name = current_layers[layer_name].ref_layer_name,
      symbols_map = current_layers[layer_name].symbols_map,
      rendered_field = current_layers[layer_name].rendered_field;

  var prev_settings = [],
      prev_settings_defaults = {},
      zs = d3.zoomTransform(svg_map).k;

  get_prev_settings();

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (!confirmed) {
      restore_prev_settings();
    } else if (new_layer_name !== layer_name) {
      change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
    }
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  popup.append('p').styles({ 'text-align': 'center', color: 'grey' }).html([i18next.t('app_page.layer_style_popup.rendered_field', { field: rendered_field }), i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name })].join(''));

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
  popup.append('p').style('text-align', 'center').insert('button').attrs({ id: 'reset_symb_loc', class: 'button_st4' }).text(i18next.t('app_page.layer_style_popup.reset_symbols_location')).on('click', function () {
    selection.transition().attrs(function (d) {
      var centroid = path.centroid(d.geometry),
          size_symbol = symbols_map.get(d.properties.symbol_field)[1] / 2;
      return { x: centroid[0] - size_symbol, y: centroid[1] - size_symbol };
    });
  });

  popup.append('p').style('text-align', 'center').insert('button').attrs({ id: 'reset_symb_display', class: 'button_st4' }).text(i18next.t('app_page.layer_style_popup.redraw_symbols')).on('click', function () {
    selection.style('display', undefined);
  });

  var size_section = popup.append('p');
  size_section.append('span').html(i18next.t('app_page.layer_style_popup.symbols_size'));
  size_section.append('input').attrs({ min: 0, max: 200, step: 'any', value: 32, type: 'number' }).styles({ width: '60px', margin: 'auto' }).on('change', function () {
    var value = this.value;
    selection.transition().attrs(function () {
      var current_size = this.height.baseVal.value;
      return {
        width: value + 'px',
        height: value + 'px',
        x: this.x.baseVal.value + current_size / 2 - value / 2,
        y: this.y.baseVal.value + current_size / 2 - value / 2
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
    var features = selection._groups[0];
    prev_settings = [];
    for (var i = 0; i < features.length; i++) {
      prev_settings.push({
        color: features[i].style.fill,
        size: features[i].style.fontSize,
        display: features[i].style.display ? features[i].style.display : null,
        position: [features[i].getAttribute('x'), features[i].getAttribute('y')],
        font: features[i].style.fontFamily
      });
    }
    prev_settings_defaults = {
      color: current_layers[layer_name].fill_color,
      size: current_layers[layer_name].default_size,
      font: current_layers[layer_name].default_font
    };
  }

  function restore_prev_settings() {
    var features = selection._groups[0];
    for (var i = 0; i < features.length; i++) {
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

  var selection = map.select('#' + _app.layer_to_id.get(layer_name)).selectAll('text'),
      ref_layer_name = current_layers[layer_name].ref_layer_name;
  var rendering_params = {};
  var prev_settings_defaults = {};
  var prev_settings = [];

  get_prev_settings();

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (!confirmed) {
      restore_prev_settings();
    } else {
      // Change the layer name if requested :
      if (new_layer_name !== layer_name) {
        change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
      }
    }
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  popup.append('p').styles({ 'text-align': 'center', color: 'grey' }).html([i18next.t('app_page.layer_style_popup.rendered_field', { field: current_layers[layer_name].rendered_field }), i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name })].join(''));

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
  popup.append('p').style('text-align', 'center').insert('button').attrs({ id: 'reset_labels_loc', class: 'button_st4' }).text(i18next.t('app_page.layer_style_popup.reset_labels_location')).on('click', function () {
    selection.transition().attrs(function (d) {
      var coords = path.centroid(d.geometry);
      return { x: coords[0], y: coords[1] };
    });
  });

  popup.append('p').style('text-align', 'center').insert('button').attr('id', 'reset_labels_display').attr('class', 'button_st4').text(i18next.t('app_page.layer_style_popup.redraw_labels')).on('click', function () {
    selection.style('display', undefined);
  });

  popup.insert('p').style('text-align', 'center').style('font-size', '9px').html(i18next.t('app_page.layer_style_popup.overrride_warning'));
  var label_sizes = popup.append('p').attr('class', 'line_elem');
  label_sizes.append('span').html(i18next.t('app_page.layer_style_popup.labels_default_size'));
  label_sizes.insert('span').style('float', 'right').html(' px');
  label_sizes.insert('input').styles({ float: 'right', width: '70px' }).attr('type', 'number').attr('value', +current_layers[layer_name].default_size.replace('px', '')).on('change', function () {
    var size = this.value + 'px';
    current_layers[layer_name].default_size = size;
    selection.style('font-size', size);
  });

  var default_color = popup.insert('p').attr('class', 'line_elem');
  default_color.append('span').html(i18next.t('app_page.layer_style_popup.labels_default_color'));
  default_color.insert('input').style('float', 'right').attrs({ type: 'color', value: current_layers[layer_name].fill_color }).on('change', function () {
    current_layers[layer_name].fill_color = this.value;
    selection.transition().style('fill', this.value);
  });

  var font_section = popup.insert('p').attr('class', 'line_elem');
  font_section.append('span').html(i18next.t('app_page.layer_style_popup.labels_default_font'));
  var choice_font = font_section.insert('select').style('float', 'right').on('change', function () {
    current_layers[layer_name].default_font = this.value;
    selection.transition().style('font-family', this.value);
  });

  available_fonts.forEach(function (name) {
    choice_font.append('option').attr('value', name[1]).text(name[0]);
  });
  choice_font.node().value = current_layers[layer_name].default_font;
}

function createStyleBoxGraticule(layer_name) {
  check_remove_existing_box('.styleBox');
  var current_params = cloneObj(current_layers.Graticule);
  var selection = map.select('#Graticule > path');
  var selection_strokeW = map.select('#Graticule');

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (confirmed) {
      return null;
    } else {
      return null;
    }
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');
  // let new_layer_name = layer_name;
  // const new_name_section = make_change_layer_name_section(popup, layer_name);
  // new_name_section.on('change', function() {
  //   new_layer_name = this.value;
  // });

  var color_choice = popup.append('p').attr('class', 'line_elem');
  color_choice.append('span').html(i18next.t('app_page.layer_style_popup.color'));
  color_choice.append('input').style('float', 'right').attrs({ type: 'color', value: current_params.fill_color.single }).on('change', function () {
    selection.style('stroke', this.value);
    current_layers.Graticule.fill_color.single = this.value;
  });

  var opacity_choice = popup.append('p').attr('class', 'line_elem');
  opacity_choice.append('span').html(i18next.t('app_page.layer_style_popup.opacity'));
  opacity_choice.append('input').attrs({ type: 'range', value: current_params.opacity, min: 0, max: 1, step: 0.1 }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    selection.style('stroke-opacity', this.value);
    current_layers.Graticule.opacity = +this.value;
    popup.select('#graticule_opacity_txt').html(+this.value * 100 + '%');
  });
  opacity_choice.append('span').attr('id', 'graticule_opacity_txt').style('float', 'right').html(current_params.opacity * 100 + '%');

  var stroke_width_choice = popup.append('p').attr('class', 'line_elem');
  stroke_width_choice.append('span').html(i18next.t('app_page.layer_style_popup.width'));
  stroke_width_choice.append('input').attrs({ type: 'number', value: current_params['stroke-width-const'] }).styles({ width: '60px', float: 'right' }).on('change', function () {
    selection_strokeW.style('stroke-width', this.value);
    current_layers.Graticule['stroke-width-const'] = +this.value;
  });

  var steps_choice = popup.append('p').attr('class', 'line_elem');
  steps_choice.append('span').html(i18next.t('app_page.layer_style_popup.graticule_steps'));
  steps_choice.append('input').attrs({ id: 'graticule_range_steps', type: 'range', value: current_params.step, min: 0, max: 100, step: 1 }).styles({ 'vertical-align': 'middle', width: '58px', display: 'inline', float: 'right' }).on('change', function () {
    var next_layer = selection_strokeW.node().nextSibling;
    var step_val = +this.value;
    var dasharray_val = +document.getElementById('graticule_dasharray_txt').value;
    current_layers.Graticule.step = step_val;
    map.select('#Graticule').remove();
    map.append('g').attrs({ id: 'Graticule', class: 'layer' }).append('path').datum(d3.geoGraticule().step([step_val, step_val])).attrs({ class: 'graticule', d: path, 'clip-path': 'url(#clip)' }).styles({ fill: 'none', stroke: current_layers.Graticule.fill_color.single, 'stroke-dasharray': dasharray_val });
    zoom_without_redraw();
    selection = map.select('#Graticule').selectAll('path');
    selection_strokeW = map.select('#Graticule');
    svg_map.insertBefore(selection_strokeW.node(), next_layer);
    popup.select('#graticule_step_txt').attr('value', step_val);
  });
  steps_choice.append('input').attrs({ type: 'number', value: current_params.step, min: 0, max: 100, step: 'any', class: 'without_spinner', id: 'graticule_step_txt' }).styles({ width: '30px', 'margin-left': '10px', float: 'right' }).on('change', function () {
    var grat_range = document.getElementById('graticule_range_steps');
    grat_range.value = +this.value;
    grat_range.dispatchEvent(new MouseEvent('change'));
  });

  var dasharray_choice = popup.append('p').attr('class', 'line_elem');
  dasharray_choice.append('span').html(i18next.t('app_page.layer_style_popup.graticule_dasharray'));
  dasharray_choice.append('input').attrs({ type: 'range', value: current_params.dasharray, min: 0, max: 50, step: 0.1, id: 'graticule_range_dasharray' }).styles({ 'vertical-align': 'middle', width: '58px', display: 'inline', float: 'right' }).on('change', function () {
    selection.style('stroke-dasharray', this.value);
    current_layers.Graticule.dasharray = +this.value;
    popup.select('#graticule_dasharray_txt').attr('value', this.value);
  });
  dasharray_choice.append('input').attrs({ type: 'number', value: current_params.dasharray, min: 0, max: 100, step: 'any', class: 'without_spinner', id: 'graticule_dasharray_txt' }).styles({ width: '30px', 'margin-left': '10px', float: 'right' }).on('change', function () {
    var grat_range = document.getElementById('graticule_range_dasharray');
    grat_range.value = +this.value;
    grat_range.dispatchEvent(new MouseEvent('change'));
  });

  var clip_extent_section = popup.append('p').attr('class', 'line_elem');
  clip_extent_section.append('input').attrs({ type: 'checkbox', id: 'clip_graticule', checked: current_params.extent ? true : null }).on('change', function () {
    var next_layer = selection_strokeW.node().nextSibling,
        step_val = +document.getElementById('graticule_step_txt').value,
        dasharray_val = +document.getElementById('graticule_dasharray_txt').value;
    var graticule = d3.geoGraticule().step([step_val, step_val]);
    map.select('#Graticule').remove();
    if (this.checked) {
      var bbox_layer = _target_layer_file.bbox;
      var extent_grat = [[Math.round((bbox_layer[0] - 12) / 10) * 10, Math.round((bbox_layer[1] - 12) / 10) * 10], [Math.round((bbox_layer[2] + 12) / 10) * 10, Math.round((bbox_layer[3] + 12) / 10) * 10]];

      if (extent_grat[0] < -180) extent_grat[0] = -180;
      if (extent_grat[1] < -90) extent_grat[1] = -90;
      if (extent_grat[2] > 180) extent_grat[2] = 180;
      if (extent_grat[3] > 90) extent_grat[3] = 90;
      graticule = graticule.extent(extent_grat);
      current_layers.Graticule.extent = extent_grat;
    } else {
      current_layers.Graticule.extent = undefined;
    }
    map.append('g').attrs({ id: 'Graticule', class: 'layer' }).append('path').datum(graticule).attrs({ class: 'graticule', d: path, 'clip-path': 'url(#clip)' }).styles({ fill: 'none', stroke: current_layers.Graticule.fill_color.single, 'stroke-dasharray': dasharray_val });
    zoom_without_redraw();
    selection = map.select('#Graticule').selectAll('path');
    selection_strokeW = map.select('#Graticule');
    svg_map.insertBefore(selection_strokeW.node(), next_layer);
  });
  clip_extent_section.append('label').attrs({ for: 'clip_graticule' }).html(i18next.t('app_page.layer_style_popup.graticule_clip'));

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
  var _ref = type_legend === 'default' ? [['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_choro] : type_legend === 'line_class' ? [['#legend_root_lines_class.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_discont_links] : type_legend === 'line_symbol' ? [['#legend_root_lines_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_line_symbol] : type_legend === 'waffle' ? [['#legend_root_waffle.lgdf_', _app.layer_to_id.get(layer_name)].join(''), createLegend_waffle] : undefined,
      _ref2 = _slicedToArray(_ref, 2),
      selector = _ref2[0],
      legend_func = _ref2[1];

  var lgd = document.querySelector(selector);
  if (lgd) {
    var transform_param = lgd.getAttribute('transform'),
        lgd_title = lgd.querySelector('#legendtitle').innerHTML,
        lgd_subtitle = lgd.querySelector('#legendsubtitle').innerHTML,
        rounding_precision = lgd.getAttribute('rounding_precision'),
        note = lgd.querySelector('#legend_bottom_note').innerHTML,
        boxgap = lgd.getAttribute('boxgap');
    var rect_fill_value = lgd.getAttribute('visible_rect') === 'true' ? {
      color: lgd.querySelector('#under_rect').style.fill,
      opacity: lgd.querySelector('#under_rect').style.fillOpacity
    } : undefined;

    if (type_legend === 'default') {
      var no_data_txt = lgd.querySelector('#no_data_txt');
      no_data_txt = no_data_txt != null ? no_data_txt.textContent : null;

      lgd.remove();
      legend_func(layer_name, field, lgd_title, lgd_subtitle, boxgap, rect_fill_value, rounding_precision, no_data_txt, note);
    } else if (type_legend === 'waffle') {
      lgd.remove();
      legend_func(layer_name, field, lgd_title, lgd_subtitle, rect_fill_value, note);
    } else {
      lgd.remove();
      legend_func(layer_name, current_layers[layer_name].rendered_field, lgd_title, lgd_subtitle, rect_fill_value, rounding_precision, note);
    }
    lgd = document.querySelector(selector);
    if (transform_param) {
      lgd.setAttribute('transform', transform_param);
    }
  }
}

function createStyleBox_Line(layer_name) {
  check_remove_existing_box('.styleBox');
  var renderer = current_layers[layer_name].renderer,
      g_lyr_name = '#' + _app.layer_to_id.get(layer_name),
      selection = map.select(g_lyr_name).selectAll('path'),
      opacity = selection.style('fill-opacity');

  var fill_prev = cloneObj(current_layers[layer_name].fill_color);
  var prev_col_breaks = void 0;
  var rendering_params = void 0;

  if (current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }

  var border_opacity = selection.style('stroke-opacity'),
      stroke_width = +current_layers[layer_name]['stroke-width-const'];
  var stroke_prev = selection.style('stroke');
  var prev_min_display = void 0,
      prev_size = void 0,
      prev_breaks = void 0;

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  var table = [];
  Array.prototype.forEach.call(svg_map.querySelector(g_lyr_name).querySelectorAll('path'), function (d) {
    table.push(d.__data__.properties);
  });

  var redraw_prop_val = function redraw_prop_val(prop_values) {
    var selec = selection._groups[0];
    for (var i = 0, len = prop_values.length; i < len; i++) {
      selec[i].style.strokeWidth = prop_values[i];
    }
  };

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (confirmed) {
      if (renderer !== undefined && rendering_params !== undefined && renderer !== 'Categorical' && renderer !== 'PropSymbolsTypo') {
        current_layers[layer_name].fill_color = { class: rendering_params.colorsByFeature };
        var colors_breaks = [];
        for (var i = rendering_params.breaks.length - 1; i > 0; --i) {
          colors_breaks.push([[rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.breaks[i - 1]]);
        }
        current_layers[layer_name].colors_breaks = colors_breaks;
        current_layers[layer_name].rendered_field = rendering_params.field;
        current_layers[layer_name].options_disc = {
          schema: rendering_params.schema,
          colors: rendering_params.colors,
          no_data: rendering_params.no_data,
          type: rendering_params.type,
          breaks: rendering_params.breaks,
          extra_options: rendering_params.extra_options
        };
        redraw_legend('default', layer_name, rendering_params.field);
      } else if ((renderer === 'Categorical' || renderer === 'PropSymbolsTypo') && rendering_params !== undefined) {
        current_layers[layer_name].color_map = rendering_params.color_map;
        current_layers[layer_name].fill_color = {
          class: [].concat(rendering_params.colorsByFeature)
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
      selection.style('fill-opacity', opacity).style('stroke-opacity', border_opacity);
      var zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', stroke_width / zoom_scale + 'px');
      current_layers[layer_name]['stroke-width-const'] = stroke_width;
      var fill_meth = Object.getOwnPropertyNames(fill_prev)[0];

      if (current_layers[layer_name].renderer === 'Links' && prev_min_display !== undefined) {
        current_layers[layer_name].min_display = prev_min_display;
        current_layers[layer_name].breaks = prev_breaks;
        selection.style('fill-opacity', 0).style('stroke', fill_prev.single).style('display', function (d) {
          return +d.properties[current_layers[layer_name].rendered_field] > prev_min_display ? null : 'none';
        }).style('stroke-opacity', border_opacity).style('stroke-width', function (d, i) {
          return current_layers[layer_name].linksbyId[i][2];
        });
      } else if (current_layers[layer_name].renderer === 'DiscLayer' && prev_min_display !== undefined) {
        current_layers[layer_name].min_display = prev_min_display;
        current_layers[layer_name].size = prev_size;
        current_layers[layer_name].breaks = prev_breaks;
        var lim = prev_min_display !== 0 ? prev_min_display * current_layers[layer_name].n_features : -1;
        selection.style('fill-opacity', 0).style('stroke', fill_prev.single).style('stroke-opacity', border_opacity).style('display', function (d, i) {
          return +i <= lim ? null : 'none';
        }).style('stroke-width', function (d) {
          return d.properties.prop_val;
        });
      } else {
        if (fill_meth === 'single') {
          selection.style('stroke', fill_prev.single).style('stroke-opacity', border_opacity);
        } else if (fill_meth === 'random') {
          selection.style('stroke-opacity', border_opacity).style('stroke', function () {
            return Colors.names[Colors.random()];
          });
        } else if (fill_meth === 'class' && renderer === 'Links') {
          selection.style('stroke-opacity', function (d, i) {
            return current_layers[layer_name].linksbyId[i][0];
          }).style('stroke', stroke_prev);
        }
      }
      if (current_layers[layer_name].colors_breaks) {
        current_layers[layer_name].colors_breaks = prev_col_breaks;
      }
      current_layers[layer_name].fill_color = fill_prev;
      zoom_without_redraw();
    }
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  if (renderer === 'Categorical' || renderer === 'PropSymbolsTypo') {
    var color_field = renderer === 'Categorical' ? current_layers[layer_name].rendered_field : current_layers[layer_name].rendered_field2;

    popup.insert('p').styles({ margin: 'auto', 'text-align': 'center' }).append('button').attr('class', 'button_disc').styles({ 'font-size': '0.8em', 'text-align': 'center' }).html(i18next.t('app_page.layer_style_popup.choose_colors')).on('click', function () {
      var _prepare_categories_a = prepare_categories_array(layer_name, color_field, current_layers[layer_name].color_map),
          _prepare_categories_a2 = _slicedToArray(_prepare_categories_a, 2),
          cats = _prepare_categories_a2[0],
          _ = _prepare_categories_a2[1];

      container.modal.hide();
      display_categorical_box(result_data[layer_name], layer_name, color_field, cats).then(function (confirmed) {
        container.modal.show();
        if (confirmed) {
          rendering_params = {
            nb_class: confirmed[0],
            color_map: confirmed[1],
            colorsByFeature: confirmed[2],
            renderer: 'Categorical',
            rendered_field: color_field,
            field: color_field
          };
          selection.transition().style('stroke', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else if (renderer === 'Choropleth' || renderer === 'PropSymbolsChoro') {
    popup.append('p').styles({ margin: 'auto', 'text-align': 'center' }).append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_discretization')).on('click', function () {
      container.modal.hide();
      display_discretization(layer_name, current_layers[layer_name].rendered_field, current_layers[layer_name].colors_breaks.length, current_layers[layer_name].options_disc).then(function (confirmed) {
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
            extra_options: confirmed[7]
          };
          selection.transition().style('stroke', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else {
    var c_section = popup.append('p').attr('class', 'line_elem');
    c_section.insert('span').html(i18next.t('app_page.layer_style_popup.color'));
    c_section.insert('input').attrs({ type: 'color', value: stroke_prev }).style('float', 'right').on('change', function () {
      selection.style('stroke', this.value);
      current_layers[layer_name].fill_color = { single: this.value };
      // current_layers[layer_name].fill_color.single = this.value;
    });
  }

  if (renderer === 'Links') {
    prev_min_display = current_layers[layer_name].min_display || 0;
    prev_breaks = current_layers[layer_name].breaks.slice();
    var fij_field = current_layers[layer_name].rendered_field;
    var max_val = 0;
    selection.each(function (d) {
      if (+d.properties[fij_field] > max_val) max_val = +d.properties[fij_field];
    });
    var threshold_section = popup.append('p').attr('class', 'line_elem');
    threshold_section.append('span').html(i18next.t('app_page.layer_style_popup.display_flow_larger'));
    // The legend will be updated in order to start on the minimum value displayed instead of
    //   using the minimum value of the serie (skipping unused class if necessary)
    threshold_section.insert('input').attrs({ type: 'range', min: 0, max: max_val, step: 0.5, value: prev_min_display }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' }).on('change', function () {
      var val = +this.value;
      popup.select('#larger_than').html(['<i> ', val, ' </i>'].join(''));
      selection.style('display', function (d) {
        return +d.properties[fij_field] > val ? null : 'none';
      });
      current_layers[layer_name].min_display = val;
    });
    threshold_section.insert('label').attr('id', 'larger_than').style('float', 'right').html('<i> ' + prev_min_display + ' </i>');
    popup.append('p').style('text-align', 'center').append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.modify_size_class')).on('click', function () {
      container.modal.hide();
      display_discretization_links_discont(layer_name, current_layers[layer_name].rendered_field, current_layers[layer_name].breaks.length, 'user_defined').then(function (result) {
        container.modal.show();
        if (result) {
          var serie = result[0],
              sizes = result[1].map(function (ft) {
            return ft[1];
          }),
              links_byId = current_layers[layer_name].linksbyId;
          serie.setClassManually(result[2]);
          current_layers[layer_name].breaks = result[1];
          selection.style('fill-opacity', 0).style('stroke-width', function (d, i) {
            return sizes[serie.getClass(+links_byId[i][1])];
          });
        }
      });
    });
  } else if (renderer === 'DiscLayer') {
    prev_min_display = current_layers[layer_name].min_display || 0;
    prev_size = current_layers[layer_name].size.slice();
    prev_breaks = current_layers[layer_name].breaks.slice();
    var _max_val = Math.max.apply(null, result_data[layer_name].map(function (i) {
      return i.disc_value;
    }));
    var disc_part = popup.append('p').attr('class', 'line_elem');
    disc_part.append('span').html(i18next.t('app_page.layer_style_popup.discont_threshold'));
    disc_part.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: prev_min_display }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' }).on('change', function () {
      var val = +this.value;
      var lim = val !== 0 ? val * current_layers[layer_name].n_features : -1;
      popup.select('#larger_than').html(['<i> ', val * 100, ' % </i>'].join(''));
      selection.style('display', function (d, i) {
        return i <= lim ? null : 'none';
      });
      current_layers[layer_name].min_display = val;
    });
    disc_part.insert('label').attr('id', 'larger_than').style('float', 'right').html(['<i> ', prev_min_display * 100, ' % </i>'].join(''));
    popup.append('p').style('text-align', 'center').append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_discretization')).on('click', function () {
      container.modal.hide();
      display_discretization_links_discont(layer_name, 'disc_value', current_layers[layer_name].breaks.length, 'user_defined').then(function (result) {
        container.modal.show();
        if (result) {
          var serie = result[0],
              sizes = result[1].map(function (ft) {
            return ft[1];
          });

          serie.setClassManually(result[2]);
          current_layers[layer_name].breaks = result[1];
          current_layers[layer_name].size = [sizes[0], sizes[sizes.length - 1]];
          selection.style('fill-opacity', 0).style('stroke-width', function (d, i) {
            return sizes[serie.getClass(+d.properties.disc_value)];
          });
        }
      });
    });
  }

  var opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span').html(i18next.t('app_page.layer_style_popup.opacity'));
  opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    opacity_section.select('#opacity_val_txt').html(' ' + this.value);
    selection.style('stroke-opacity', this.value);
  });

  opacity_section.append('span').attr('id', 'opacity_val_txt').style('display', 'inline').style('float', 'right').html(' ' + border_opacity);

  if (!renderer || !renderer.startsWith('PropSymbols') && renderer !== 'DiscLayer' && renderer !== 'Links') {
    var width_section = popup.append('p');
    width_section.append('span').html(i18next.t('app_page.layer_style_popup.width'));
    width_section.insert('input').attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width }).styles({ width: '60px', float: 'right' }).on('change', function () {
      var val = +this.value;
      var zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', val / zoom_scale + 'px');
      current_layers[layer_name]['stroke-width-const'] = val;
    });
  } else if (renderer.startsWith('PropSymbols')) {
    var field_used = current_layers[layer_name].rendered_field;
    var d_values = result_data[layer_name].map(function (f) {
      return +f[field_used];
    });
    var prop_val_content = popup.append('p');
    prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.field_symbol_size', { field: current_layers[layer_name].rendered_field }));
    prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.symbol_fixed_size'));
    prop_val_content.insert('input').styles({ width: '60px', float: 'right' }).attrs({ type: 'number', id: 'max_size_range', min: 0.1, step: 'any', value: current_layers[layer_name].size[1] }).on('change', function () {
      var f_size = +this.value;
      var prop_values = prop_sizer3_e(d_values, current_layers[layer_name].size[0], f_size, 'line');
      current_layers[layer_name].size[1] = f_size;
      redraw_prop_val(prop_values);
    });
    prop_val_content.append('span').style('float', 'right').html('(px)');

    var prop_val_content2 = popup.append('p').attr('class', 'line_elem');
    prop_val_content2.append('span').html(i18next.t('app_page.layer_style_popup.on_value'));
    prop_val_content2.insert('input').styles({ width: '100px', float: 'right' }).attrs({ type: 'number', min: 0.1, step: 0.1, value: +current_layers[layer_name].size[0] }).on('change', function () {
      var f_val = +this.value;
      var prop_values = prop_sizer3_e(d_values, f_val, current_layers[layer_name].size[1], 'line');
      redraw_prop_val(prop_values);
      current_layers[layer_name].size[0] = f_val;
    });
  }

  make_generate_labels_section(popup, layer_name);
}

function createStyleBox(layer_name) {
  check_remove_existing_box('.styleBox');
  var type = current_layers[layer_name].type,
      isSphere = current_layers[layer_name].sphere === true,
      renderer = current_layers[layer_name].renderer,
      g_lyr_name = '#' + _app.layer_to_id.get(layer_name),
      selection = map.select(g_lyr_name).selectAll('path'),
      opacity = selection.style('fill-opacity');
  var fill_prev = cloneObj(current_layers[layer_name].fill_color);
  var prev_col_breaks = void 0;
  var rendering_params = void 0;
  if (current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }
  var border_opacity = selection.style('stroke-opacity'),
      stroke_width = +current_layers[layer_name]['stroke-width-const'];
  var table = [];
  var stroke_prev = selection.style('stroke');
  var prev_min_display = void 0,
      prev_size = void 0,
      prev_breaks = void 0,
      current_pt_size = void 0;

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  Array.prototype.forEach.call(svg_map.querySelector(g_lyr_name).querySelectorAll('path'), function (d) {
    table.push(d.__data__.properties);
  });
  var fields_layer = !isSphere ? current_layers[layer_name].fields_type || type_col2(table) : [];

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (confirmed) {
      // Update the object holding the properties of the layer if Yes is clicked
      if (type === 'Point' && current_layers[layer_name].pointRadius) {
        current_layers[layer_name].pointRadius = +current_pt_size;
      }
      if (renderer !== undefined && rendering_params !== undefined && renderer !== 'Categorical') {
        current_layers[layer_name].fill_color = { class: rendering_params.colorsByFeature };
        var colors_breaks = [];
        for (var i = rendering_params.breaks.length - 1; i > 0; --i) {
          colors_breaks.push([[rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.colors[i - 1]]);
        }
        current_layers[layer_name].colors_breaks = colors_breaks;
        current_layers[layer_name].rendered_field = rendering_params.field;
        current_layers[layer_name].options_disc = {
          schema: rendering_params.schema,
          colors: rendering_params.colors,
          no_data: rendering_params.no_data,
          type: rendering_params.type,
          breaks: rendering_params.breaks,
          extra_options: rendering_params.extra_options
        };
      } else if (renderer === 'Categorical' && rendering_params !== undefined) {
        current_layers[layer_name].color_map = rendering_params.color_map;
        current_layers[layer_name].fill_color = {
          class: [].concat(rendering_params.colorsByFeature)
        };
      }

      if (rendering_params !== undefined && rendering_params.field !== undefined) {
        redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
      }
      // Change the layer name if requested :
      if (new_layer_name !== layer_name) {
        change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
      }
      zoom_without_redraw();
    } else {
      // Reset to original values the rendering parameters if "no" is clicked
      selection.style('fill-opacity', opacity).style('stroke-opacity', border_opacity);
      var zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', stroke_width / zoom_scale + 'px');
      current_layers[layer_name]['stroke-width-const'] = stroke_width;
      var fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
      if (type === 'Point' && current_layers[layer_name].pointRadius) {
        selection.attr('d', path.pointRadius(+current_layers[layer_name].pointRadius));
      } else {
        if (fill_meth === 'single') {
          selection.style('fill', fill_prev.single).style('stroke', stroke_prev);
        } else if (fill_meth === 'class') {
          selection.style('fill-opacity', opacity).style('fill', function (d, i) {
            return fill_prev.class[i];
          }).style('stroke-opacity', border_opacity).style('stroke', stroke_prev);
        } else if (fill_meth === 'random') {
          selection.style('fill', function () {
            return Colors.names[Colors.random()];
          }).style('stroke', stroke_prev);
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

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  var new_layer_name = layer_name;
  if (layer_name !== 'World') {
    var new_name_section = make_change_layer_name_section(popup, layer_name);
    new_name_section.on('change', function () {
      new_layer_name = this.value;
    });
  }

  if (type === 'Point') {
    current_pt_size = current_layers[layer_name].pointRadius;
    var pt_size = popup.append('p').attr('class', 'line_elem');
    pt_size.append('span').html(i18next.t('app_page.layer_style_popup.point_radius'));
    pt_size.append('input').attrs({ type: 'range', min: 0, max: 80, value: current_pt_size, id: 'point_radius_size' }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' }).on('change', function () {
      current_pt_size = +this.value;
      document.getElementById('point_radius_size_txt').value = current_pt_size;
      selection.attr('d', path.pointRadius(current_pt_size));
    });
    pt_size.append('input').attrs({ type: 'number', value: +current_pt_size, min: 0, max: 80, step: 'any', class: 'without_spinner', id: 'point_radius_size_txt' }).styles({ width: '30px', 'margin-left': '10px', float: 'right' }).on('change', function () {
      var pt_size_range = document.getElementById('point_radius_size');
      var old_value = pt_size_range.value;
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
      var fields = getFieldsType('category', null, fields_layer);
      var fill_method = popup.append('p').html(i18next.t('app_page.layer_style_popup.fill_color')).insert('select');
      [[i18next.t('app_page.layer_style_popup.single_color'), 'single'], [i18next.t('app_page.layer_style_popup.categorical_color'), 'categorical'], [i18next.t('app_page.layer_style_popup.random_color'), 'random']].forEach(function (d, i) {
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
    var rendered_field = current_layers[layer_name].rendered_field;

    popup.insert('p').styles({ margin: 'auto', 'text-align': 'center' }).append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_colors')).on('click', function () {
      container.modal.hide();

      var _prepare_categories_a3 = prepare_categories_array(layer_name, rendered_field, current_layers[layer_name].color_map),
          _prepare_categories_a4 = _slicedToArray(_prepare_categories_a3, 2),
          cats = _prepare_categories_a4[0],
          _ = _prepare_categories_a4[1];

      display_categorical_box(result_data[layer_name], layer_name, rendered_field, cats).then(function (confirmed) {
        container.modal.show();
        if (confirmed) {
          rendering_params = {
            nb_class: confirmed[0],
            color_map: confirmed[1],
            colorsByFeature: confirmed[2],
            renderer: 'Categorical',
            rendered_field: rendered_field,
            field: rendered_field
          };
          selection.transition().style('fill', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else if (renderer === 'Choropleth') {
    popup.append('p').styles({ margin: 'auto', 'text-align': 'center' }).append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_discretization')).on('click', function () {
      container.modal.hide();
      display_discretization(layer_name, current_layers[layer_name].rendered_field, current_layers[layer_name].colors_breaks.length,
      //  "quantiles",
      current_layers[layer_name].options_disc).then(function (confirmed) {
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
            extra_options: confirmed[7]
          };
          //  let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
          selection.transition().style('fill', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else if (renderer === 'Gridded') {
    var field_to_discretize = current_layers[layer_name].rendered_field;
    popup.append('p').style('margin', 'auto').style('text-align', 'center').append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_discretization')).on('click', function () {
      container.modal.hide();
      display_discretization(layer_name, field_to_discretize, current_layers[layer_name].colors_breaks.length,
      //  "quantiles",
      current_layers[layer_name].options_disc).then(function (confirmed) {
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
            extra_options: confirmed[7]
          };
          // let opacity_val = fill_opacity_section ? +fill_opacity_section.node().value : 0.9
          selection.transition().style('fill', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  }

  var fill_opacity_section = popup.append('p').attr('class', 'line_elem');
  fill_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' }).on('change', function () {
    selection.style('fill-opacity', this.value);
    fill_opacity_section.select('#fill_opacity_txt').html(this.value * 100 + '%');
  });
  fill_opacity_section.append('span').style('float', 'right').attr('id', 'fill_opacity_txt').html(+opacity * 100 + '%');

  var c_section = popup.append('p').attr('class', 'line_elem');
  c_section.insert('span').html(i18next.t('app_page.layer_style_popup.border_color'));
  c_section.insert('input').attrs({ type: 'color', value: stroke_prev }).style('float', 'right').on('change', function () {
    selection.style('stroke', this.value);
  });

  var opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span').html(i18next.t('app_page.layer_style_popup.border_opacity'));
  opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    opacity_section.select('#opacity_val_txt').html(' ' + this.value);
    selection.style('stroke-opacity', this.value);
  });

  opacity_section.append('span').attr('id', 'opacity_val_txt').styles({ display: 'inline', float: 'right' }).html(' ' + border_opacity);

  var width_section = popup.append('p');
  width_section.append('span').html(i18next.t('app_page.layer_style_popup.border_width'));
  width_section.insert('input').attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width }).styles({ width: '60px', float: 'right' }).on('change', function () {
    var val = +this.value;
    var zoom_scale = +d3.zoomTransform(map.node()).k;
    map.select(g_lyr_name).style('stroke-width', val / zoom_scale + 'px');
    current_layers[layer_name]['stroke-width-const'] = val;
  });

  var shadow_section = popup.append('p');
  var chkbx = shadow_section.insert('input').style('margin', '0').attrs({
    type: 'checkbox',
    id: 'checkbox_shadow_layer',
    checked: map.select(g_lyr_name).attr('filter') ? true : null });
  shadow_section.insert('label').attr('for', 'checkbox_shadow_layer').html(i18next.t('app_page.layer_style_popup.layer_shadow'));
  chkbx.on('change', function () {
    if (this.checked) {
      createDropShadow(_app.layer_to_id.get(layer_name));
    } else {
      var filter_id = map.select(g_lyr_name).attr('filter');
      svg_map.querySelector(filter_id.substring(4).replace(')', '')).remove();
      map.select(g_lyr_name).attr('filter', null);
    }
  });
  make_generate_labels_section(popup, layer_name);
}

function createStyleBoxStewart(layer_name) {
  check_remove_existing_box('.styleBox');
  var g_lyr_name = '#' + _app.layer_to_id.get(layer_name),
      selection = map.select(g_lyr_name).selectAll('path'),
      opacity = selection.style('fill-opacity');

  var nb_ft = current_layers[layer_name].n_features;
  var prev_palette = cloneObj(current_layers[layer_name].color_palette);

  var recolor_stewart = function recolor_stewart(coloramp_name, reversed) {
    var new_coloramp = getColorBrewerArray(nb_ft, coloramp_name);
    if (reversed) new_coloramp.reverse();
    for (var i = 0; i < nb_ft; ++i) {
      rendering_params.breaks[i][1] = new_coloramp[i];
    }
    selection.transition().style('fill', function (d, i) {
      return new_coloramp[i];
    });
    current_layers[layer_name].color_palette = { name: coloramp_name, reversed: reversed };
  };
  var fill_prev = cloneObj(current_layers[layer_name].fill_color);
  var rendering_params = { breaks: [].concat(current_layers[layer_name].colors_breaks) };
  var prev_col_breaks = void 0;
  if (current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = current_layers[layer_name].colors_breaks.concat([]);
  }
  var border_opacity = selection.style('stroke-opacity'),
      stroke_width = +current_layers[layer_name]['stroke-width-const'];
  var stroke_prev = selection.style('stroke');

  if (stroke_prev.startsWith('rgb')) {
    stroke_prev = rgb2hex(stroke_prev);
  }

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (confirmed) {
      current_layers[layer_name].colors_breaks = rendering_params.breaks;
      current_layers[layer_name].fill_color.class = rendering_params.breaks.map(function (obj) {
        return obj[1];
      });
      redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
      // Change the layer name if requested :
      if (new_layer_name !== layer_name) {
        change_layer_name(layer_name, check_layer_name(new_layer_name.trim()));
      }
      zoom_without_redraw();
    } else {
      // Reset to original values the rendering parameters if "no" is clicked
      selection.style('fill-opacity', opacity).style('stroke-opacity', border_opacity);
      var zoom_scale = +d3.zoomTransform(map.node()).k;
      map.select(g_lyr_name).style('stroke-width', stroke_width / zoom_scale + 'px');
      current_layers[layer_name]['stroke-width-const'] = stroke_width;
      var fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
      recolor_stewart(prev_palette.name, prev_palette.reversed);
      redraw_legend('default', layer_name, current_layers[layer_name].rendered_field);
      current_layers[layer_name].colors_breaks = prev_col_breaks;
      current_layers[layer_name].fill_color = fill_prev;
      zoom_without_redraw();
    }
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  var color_palette_section = popup.insert('p').attr('class', 'line_elem');
  color_palette_section.append('span').html(i18next.t('app_page.layer_style_popup.color_palette'));
  var seq_color_select = color_palette_section.insert('select').attr('id', 'coloramp_params').style('float', 'right').on('change', function () {
    recolor_stewart(this.value, false);
  });

  ['Blues', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'].forEach(function (name) {
    seq_color_select.append('option').text(name).attr('value', name);
  });
  seq_color_select.node().value = prev_palette.name;
  popup.insert('p').attr('class', 'line_elem').styles({ 'text-align': 'center', margin: '0 !important' }).insert('button').attrs({ class: 'button_st3', id: 'reverse_colramp' }).html(i18next.t('app_page.layer_style_popup.reverse_palette')).on('click', function () {
    var pal_name = document.getElementById('coloramp_params').value;
    recolor_stewart(pal_name, true);
  });

  var fill_opacity_section = popup.append('p').attr('class', 'line_elem');
  fill_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right', 'margin-right': '0px' }).on('change', function () {
    selection.style('fill-opacity', this.value);
    fill_opacity_section.select('#fill_opacity_txt').html(this.value * 100 + '%');
  });
  fill_opacity_section.append('span').style('float', 'right').attr('id', 'fill_opacity_txt').html(+opacity * 100 + '%');

  var c_section = popup.append('p').attr('class', 'line_elem');
  c_section.insert('span').html(i18next.t('app_page.layer_style_popup.border_color'));
  c_section.insert('input').attrs({ type: 'color', value: stroke_prev }).style('float', 'right').on('change', function () {
    selection.style('stroke', this.value);
  });

  var opacity_section = popup.append('p').attr('class', 'line_elem');
  opacity_section.insert('span').html(i18next.t('app_page.layer_style_popup.border_opacity'));
  opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    opacity_section.select('#opacity_val_txt').html(' ' + this.value);
    selection.style('stroke-opacity', this.value);
  });

  opacity_section.append('span').attr('id', 'opacity_val_txt').styles({ display: 'inline', float: 'right' }).html(' ' + border_opacity);

  var width_section = popup.append('p');
  width_section.append('span').html(i18next.t('app_page.layer_style_popup.border_width'));
  width_section.insert('input').attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width }).styles({ width: '60px', float: 'right' }).on('change', function () {
    var val = +this.value;
    var zoom_scale = +d3.zoomTransform(map.node()).k;
    map.select(g_lyr_name).style('stroke-width', val / zoom_scale + 'px');
    current_layers[layer_name]['stroke-width-const'] = val;
  });

  var shadow_section = popup.append('p');
  var chkbx = shadow_section.insert('input').style('margin', '0').attrs({
    type: 'checkbox',
    id: 'checkbox_shadow_layer',
    checked: map.select(g_lyr_name).attr('filter') ? true : null });
  shadow_section.insert('label').attr('for', 'checkbox_shadow_layer').html(i18next.t('app_page.layer_style_popup.layer_shadow'));
  chkbx.on('change', function () {
    if (this.checked) {
      createDropShadow(_app.layer_to_id.get(layer_name));
    } else {
      var filter_id = map.select(g_lyr_name).attr('filter');
      svg_map.querySelector(filter_id.substring(4).replace(')', '')).remove();
      map.select(g_lyr_name).attr('filter', null);
    }
  });
  make_generate_labels_section(popup, layer_name);
}

function make_generate_labels_graticule_section(parent_node) {
  var labels_section = parent_node.append('p');
  labels_section.append('span').attr('id', 'generate_labels').styles({ cursor: 'pointer', 'margin-top': '15px' }).html(i18next.t('app_page.layer_style_popup.generate_labels')).on('mouseover', function () {
    this.style.fontWeight = 'bold';
  }).on('mouseout', function () {
    this.style.fontWeight = '';
  }).on('click', function () {
    render_label_graticule('Graticule', {
      color: '#000',
      font: 'Arial,Helvetica,sans-serif',
      ref_font_size: 12,
      uo_layer_name: ['Labels', 'Graticule'].join('_')
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
  var _fields = get_fields_name(layer_name) || [];
  if (_fields && _fields.length > 0) {
    var labels_section = parent_node.append('p');
    var input_fields = {};
    for (var i = 0; i < _fields.length; i++) {
      input_fields[_fields[i]] = _fields[i];
    }
    labels_section.append('span').attr('id', 'generate_labels').styles({ cursor: 'pointer', 'margin-top': '15px' }).html(i18next.t('app_page.layer_style_popup.generate_labels')).on('mouseover', function () {
      this.style.fontWeight = 'bold';
    }).on('mouseout', function () {
      this.style.fontWeight = '';
    }).on('click', function () {
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
        inputValidator: function inputValidator(value) {
          return new Promise(function (resolve, reject) {
            if (_fields.indexOf(value) < 0) {
              reject(i18next.t('app_page.common.no_value'));
            } else {
              render_label(layer_name, {
                label_field: value,
                color: '#000',
                font: 'Arial,Helvetica,sans-serif',
                ref_font_size: 12,
                uo_layer_name: ['Labels', value, layer_name].join('_')
              });
              resolve();
            }
          });
        }
      }).then(function (value) {
        console.log(value);
      }, function (dismiss) {
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
  var elem = document.getElementById(_app.layer_to_id.get(layer_name)).childNodes[0];
  if (!elem.__data__ || !elem.__data__.properties) {
    return null;
  }
  return Object.getOwnPropertyNames(elem.__data__.properties);
}

function createStyleBoxWaffle(layer_name) {
  check_remove_existing_box('.styleBox');
  var round = Math.round;
  var floor = Math.floor;
  var layer_id = _app.layer_to_id.get(layer_name),
      g_lyr_name = '#' + layer_id,
      ref_layer_name = current_layers[layer_name].ref_layer_name,
      symbol = current_layers[layer_name].symbol,
      fields = current_layers[layer_name].rendered_field,
      selection = map.select(g_lyr_name);

  var previous_params = {
    fill_opacity: selection.selectAll(symbol).style('fill-opacity'),
    ref_colors: [].concat(current_layers[layer_name].fill_color),
    size: current_layers[layer_name].size,
    nCol: current_layers[layer_name].nCol
  };

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
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

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  popup.append('p').styles({ 'text-align': 'center', color: 'grey' }).html([i18next.t('app_page.layer_style_popup.rendered_field', { field: fields.join(' ,') }), i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name })].join(''));

  var fill_opacity_section = popup.append('p').attr('class', 'line_elem').attr('id', 'fill_color_section');

  fill_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));
  fill_opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: previous_params.fill_opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    selection.selectAll(symbol).style('fill-opacity', +this.value);
    fill_opacity_section.select('#fill_opacity_txt').html(+this.value * 100 + '%');
  });

  fill_opacity_section.append('span').attr('id', 'fill_opacity_txt').style('float', 'right').html(+previous_params.fill_opacity * 100 + '%');

  var ref_colors_section = popup.append('div').attr('id', 'ref_colors_section').style('clear', 'both');
  ref_colors_section.append('p').html(i18next.t('app_page.layer_style_popup.ref_colors'));

  var _loop = function _loop(i) {
    var p = ref_colors_section.append('p').style('margin', '15px 5px');
    p.append('span').html(current_layers[layer_name].rendered_field[i]);
    p.insert('input').attr('type', 'color').attr('id', i).attr('value', current_layers[layer_name].fill_color[i]).style('float', 'right').on('change', function () {
      // eslint-disable-line no-loop-func
      var col = rgb2hex(this.value);
      var to_replace = current_layers[layer_name].fill_color[i];
      current_layers[layer_name].fill_color[i] = col;
      selection.selectAll(symbol).each(function () {
        if (rgb2hex(this.getAttribute('fill')) === to_replace) {
          this.setAttribute('fill', col);
        }
      });
    });
  };

  for (var i = 0; i < current_layers[layer_name].fill_color.length; i++) {
    _loop(i);
  }

  var size_section = popup.append('p').attr('class', 'line_elem').attr('id', 'size_section').style('clear', 'both');

  size_section.append('span').html(i18next.t('app_page.layer_style_popup.ref_size'));
  size_section.insert('input').attrs({ type: 'range', min: 1, max: 40, step: 1, value: previous_params.size }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    var val = +this.value;
    var nCol = current_layers[layer_name].nCol;
    current_layers[layer_name].size = val;
    selection.selectAll('g').selectAll(symbol).each(function (d, i) {
      if (symbol === 'circle') {
        var t_x = round(i % nCol * 2 * val);
        var t_y = floor(floor(i / nCol) * 2 * val);
        this.setAttribute('r', val);
        this.setAttribute('transform', 'translate(-' + t_x + ', -' + t_y + ')');
      } else {
        var offset = val / 5;
        var _t_x = round(i % nCol * val) + offset * round(i % nCol);
        var _t_y = floor(floor(i / nCol) * val) + offset * floor(i / nCol);
        this.setAttribute('width', val);
        this.setAttribute('height', val);
        this.setAttribute('transform', 'translate(-' + _t_x + ', -' + _t_y + ')');
      }
    });
    size_section.select('#size_section_txt').html(this.value + ' px');
  });
  size_section.append('span').attr('id', 'size_section_txt').style('float', 'right').html(previous_params.size + ' px');

  var width_row_section = popup.append('p').attr('class', 'line_elem').attr('id', 'width_row_section');

  width_row_section.append('span').html(i18next.t('app_page.func_options.twostocks.waffle_width_rows'));
  width_row_section.insert('input').attrs({ type: 'range', min: 1, max: 10, step: 1, value: previous_params.nCol }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    var val = +this.value;
    var size = current_layers[layer_name].size;
    current_layers[layer_name].nCol = val;
    selection.selectAll('g').selectAll(symbol).each(function (d, i) {
      if (symbol === 'circle') {
        var t_x = round(i % val * 2 * size);
        var t_y = floor(floor(i / val) * 2 * size);
        this.setAttribute('transform', 'translate(-' + t_x + ', -' + t_y + ')');
      } else {
        var offset = size / 5;
        var _t_x2 = round(i % val * size) + offset * round(i % val);
        var _t_y2 = floor(floor(i / val) * size) + offset * floor(i / val);
        this.setAttribute('transform', 'translate(-' + _t_x2 + ', -' + _t_y2 + ')');
      }
    });
    width_row_section.select('#width_row_text').html(this.value);
  });
  width_row_section.append('span').attr('id', 'width_row_text').style('float', 'right').html(previous_params.nCol);

  var allow_move_section = popup.append('p');
  var chkbx = allow_move_section.insert('input').style('margin', '0').attrs({
    type: 'checkbox',
    id: 'checkbox_move_symbol',
    checked: current_layers[layer_name].draggable ? true : null });
  allow_move_section.insert('label').attr('for', 'checkbox_move_symbol').html(i18next.t('app_page.layer_style_popup.let_draggable'));
  chkbx.on('change', function () {
    if (this.checked) {
      current_layers[layer_name].draggable = true;
    } else {
      current_layers[layer_name].draggable = false;
    }
  });

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });
}

function createStyleBox_ProbSymbol(layer_name) {
  check_remove_existing_box('.styleBox');
  var layer_id = _app.layer_to_id.get(layer_name),
      g_lyr_name = '#' + layer_id,
      ref_layer_name = current_layers[layer_name].ref_layer_name,
      type_method = current_layers[layer_name].renderer,
      type_symbol = current_layers[layer_name].symbol,
      field_used = current_layers[layer_name].rendered_field,
      selection = map.select(g_lyr_name).selectAll(type_symbol),
      old_size = [current_layers[layer_name].size[0], current_layers[layer_name].size[1]];
  var rendering_params = void 0;
  var stroke_prev = selection.style('stroke');
  var stroke_width = selection.style('stroke-width');

  var opacity = selection.style('fill-opacity'),
      border_opacity = selection.style('stroke-opacity');

  var fill_prev = cloneObj(current_layers[layer_name].fill_color);
  var d_values = result_data[layer_name].map(function (v) {
    return +v[field_used];
  });
  var prev_col_breaks = void 0;
  var redraw_prop_val = function redraw_prop_val(prop_values) {
    var selec = selection._groups[0];

    if (type_symbol === 'circle') {
      for (var i = 0, len = prop_values.length; i < len; i++) {
        selec[i].setAttribute('r', prop_values[i]);
      }
    } else if (type_symbol === 'rect') {
      for (var _i = 0, _len = prop_values.length; _i < _len; _i++) {
        var old_rect_size = +selec[_i].getAttribute('height');
        var centr = [+selec[_i].getAttribute('x') + old_rect_size / 2 - prop_values[_i] / 2, +selec[_i].getAttribute('y') + old_rect_size / 2 - prop_values[_i] / 2];
        selec[_i].setAttribute('x', centr[0]);
        selec[_i].setAttribute('y', centr[1]);
        selec[_i].setAttribute('height', prop_values[_i]);
        selec[_i].setAttribute('width', prop_values[_i]);
      }
    }
  };

  if (current_layers[layer_name].colors_breaks && current_layers[layer_name].colors_breaks instanceof Array) {
    prev_col_breaks = [].concat(current_layers[layer_name].colors_breaks);
  } else if (current_layers[layer_name].break_val !== undefined) {
    prev_col_breaks = current_layers[layer_name].break_val;
  }
  if (stroke_prev.startsWith('rgb')) stroke_prev = rgb2hex(stroke_prev);
  if (stroke_width.endsWith('px')) stroke_width = stroke_width.substring(0, stroke_width.length - 2);

  make_confirm_dialog2('styleBox', layer_name, { top: true, widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (confirmed) {
      // if(current_layers[layer_name].size != old_size){
      var lgd_prop_symb = document.querySelector(['#legend_root_symbol.lgdf_', layer_id].join(''));
      if (lgd_prop_symb) {
        redraw_legends_symbols(lgd_prop_symb);
      }
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
            class: [].concat(rendering_params.colorsByFeature)
          };
          current_layers[layer_name].colors_breaks = [];
          for (var i = rendering_params.breaks.length - 1; i > 0; --i) {
            current_layers[layer_name].colors_breaks.push([[rendering_params.breaks[i - 1], ' - ', rendering_params.breaks[i]].join(''), rendering_params.colors[i - 1]]);
          }
          current_layers[layer_name].options_disc = {
            schema: rendering_params.schema,
            colors: rendering_params.colors,
            no_data: rendering_params.no_data,
            type: rendering_params.type,
            breaks: rendering_params.breaks,
            extra_options: rendering_params.extra_options
          };
        } else if (type_method === 'PropSymbolsTypo') {
          current_layers[layer_name].fill_color = {
            class: [].concat(rendering_params.colorsByFeature)
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
      var fill_meth = Object.getOwnPropertyNames(fill_prev)[0];
      if (fill_meth === 'single') {
        selection.style('fill', fill_prev.single).style('stroke-opacity', border_opacity).style('stroke', stroke_prev);
      } else if (fill_meth === 'two') {
        current_layers[layer_name].break_val = prev_col_breaks;
        current_layers[layer_name].fill_color = { two: [fill_prev.two[0], fill_prev.two[1]] };
        selection.style('fill', function (d, i) {
          return d_values[i] > prev_col_breaks ? fill_prev.two[1] : fill_prev.two[0];
        }).style('stroke-opacity', border_opacity).style('stroke', stroke_prev);
      } else if (fill_meth === 'class') {
        selection.style('fill-opacity', opacity).style('fill', function (d, i) {
          return current_layers[layer_name].fill_color.class[i];
        }).style('stroke-opacity', border_opacity).style('stroke', stroke_prev);
        current_layers[layer_name].colors_breaks = prev_col_breaks;
      } else if (fill_meth === 'random') {
        selection.style('fill', function (_) {
          return Colors.names[Colors.random()];
        }).style('stroke-opacity', border_opacity).style('stroke', stroke_prev);
      } else if (fill_meth === 'categorical') {
        fill_categorical(layer_name, fill_prev.categorical[0], type_symbol, fill_prev.categorical[1]);
      }
      current_layers[layer_name].fill_color = fill_prev;
      if (current_layers[layer_name].size[1] !== old_size[1]) {
        var prop_values = prop_sizer3_e(d_values, old_size[0], old_size[1], type_symbol);
        redraw_prop_val(prop_values);
        current_layers[layer_name].size = [old_size[0], old_size[1]];
      }
    }
    zoom_without_redraw();
  });

  var container = document.querySelector('.twbs > .styleBox');
  var popup = d3.select(container).select('.modal-content').style('width', '300px').select('.modal-body');

  popup.append('p').styles({ 'text-align': 'center', color: 'grey' }).html([i18next.t('app_page.layer_style_popup.rendered_field', { field: current_layers[layer_name].rendered_field }), i18next.t('app_page.layer_style_popup.reference_layer', { layer: ref_layer_name })].join(''));

  var new_layer_name = layer_name;
  var new_name_section = make_change_layer_name_section(popup, layer_name);
  new_name_section.on('change', function () {
    new_layer_name = this.value;
  });

  if (type_method === 'PropSymbolsChoro') {
    var field_color = current_layers[layer_name].rendered_field2;
    popup.append('p').styles({ margin: 'auto', 'text-align': 'center' }).html(i18next.t('app_page.layer_style_popup.field_symbol_color', { field: field_color })).append('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_discretization')).on('click', function () {
      container.modal.hide();
      display_discretization(layer_name, field_color, current_layers[layer_name].colors_breaks.length,
      //  "quantiles",
      current_layers[layer_name].options_disc).then(function (confirmed) {
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
            extra_options: confirmed[7]
          };
          selection.style('fill', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else if (current_layers[layer_name].break_val !== undefined) {
    var fill_color_section = popup.append('div').attr('id', 'fill_color_section');
    fill_color_section.append('p').style('text-align', 'center').html(i18next.t('app_page.layer_style_popup.color_break'));
    var p2 = fill_color_section.append('p').style('display', 'inline');
    var col1 = p2.insert('input').attr('type', 'color').attr('id', 'col1').attr('value', current_layers[layer_name].fill_color.two[0]).on('change', function () {
      var _this = this;

      var new_break_val = +b_val.node().value;
      current_layers[layer_name].fill_color.two[0] = this.value;
      selection.transition().style('fill', function (d, i) {
        return d_values[i] > new_break_val ? col2.node().value : _this.value;
      });
    });
    var col2 = p2.insert('input').attr('type', 'color').attr('id', 'col2').attr('value', current_layers[layer_name].fill_color.two[1]).on('change', function () {
      var _this2 = this;

      var new_break_val = +b_val.node().value;
      current_layers[layer_name].fill_color.two[1] = this.value;
      selection.transition().style('fill', function (d, i) {
        return d_values[i] > new_break_val ? _this2.value : col1.node().value;
      });
    });
    fill_color_section.insert('span').html(i18next.t('app_page.layer_style_popup.break_value'));
    var b_val = fill_color_section.insert('input').attrs({ type: 'number', value: current_layers[layer_name].break_val }).style('width', '75px').on('change', function () {
      var new_break_val = +this.value;
      current_layers[layer_name].break_val = new_break_val;
      selection.transition().style('fill', function (d, i) {
        return d_values[i] > new_break_val ? col2.node().value : col1.node().value;
      });
    });
  } else if (type_method === 'PropSymbolsTypo') {
    var _field_color = current_layers[layer_name].rendered_field2;
    popup.append('p').style('margin', 'auto').html(i18next.t('app_page.layer_style_popup.field_symbol_color', { field: _field_color }));
    popup.append('p').style('text-align', 'center').insert('button').attr('class', 'button_disc').html(i18next.t('app_page.layer_style_popup.choose_colors')).on('click', function () {
      var _prepare_categories_a5 = prepare_categories_array(layer_name, _field_color, current_layers[layer_name].color_map),
          _prepare_categories_a6 = _slicedToArray(_prepare_categories_a5, 2),
          cats = _prepare_categories_a6[0],
          _ = _prepare_categories_a6[1];

      container.modal.hide();
      display_categorical_box(result_data[layer_name], layer_name, _field_color, cats).then(function (confirmed) {
        container.modal.show();
        if (confirmed) {
          rendering_params = {
            nb_class: confirmed[0],
            color_map: confirmed[1],
            colorsByFeature: confirmed[2],
            renderer: 'Categorical',
            rendered_field: _field_color,
            field: _field_color
          };
          selection.style('fill', function (d, i) {
            return rendering_params.colorsByFeature[i];
          });
        }
      });
    });
  } else {
    var fields_all = type_col2(result_data[layer_name]),
        fields = getFieldsType('category', null, fields_all),
        fill_method = popup.append('p').html(i18next.t('app_page.layer_style_popup.fill_color')).insert('select');

    [[i18next.t('app_page.layer_style_popup.single_color'), 'single'], [i18next.t('app_page.layer_style_popup.random_color'), 'random']].forEach(function (d) {
      fill_method.append('option').text(d[0]).attr('value', d[1]);
    });
    popup.append('div').attr('id', 'fill_color_section');
    fill_method.on('change', function () {
      popup.select('#fill_color_section').html('').on('click', null);
      if (this.value === 'single') {
        make_single_color_menu(layer_name, fill_prev, type_symbol);
        map.select(g_lyr_name).selectAll(type_symbol).transition().style('fill', fill_prev.single);
        current_layers[layer_name].fill_color = cloneObj(fill_prev);
      } else if (this.value === 'random') {
        make_random_color(layer_name, type_symbol);
      }
    });
    setSelected(fill_method.node(), Object.getOwnPropertyNames(fill_prev)[0]);
  }

  var fill_opct_section = popup.append('p').attr('class', 'line_elem');
  fill_opct_section.append('span').html(i18next.t('app_page.layer_style_popup.fill_opacity'));

  fill_opct_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    selection.style('fill-opacity', this.value);
    fill_opct_section.select('#fill_opacity_txt').html(+this.value * 100 + '%');
  });

  fill_opct_section.append('span').attr('id', 'fill_opacity_txt').style('float', 'right').html(+opacity * 100 + '%');

  var border_color_section = popup.append('p').attr('class', 'line_elem');
  border_color_section.append('span').html(i18next.t('app_page.layer_style_popup.border_color'));
  border_color_section.insert('input').attrs({ type: 'color', value: stroke_prev }).style('float', 'right').on('change', function () {
    selection.transition().style('stroke', this.value);
  });

  var border_opacity_section = popup.append('p');
  border_opacity_section.append('span').html(i18next.t('app_page.layer_style_popup.border_opacity'));

  border_opacity_section.insert('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1, value: border_opacity }).styles({ width: '58px', 'vertical-align': 'middle', display: 'inline', float: 'right' }).on('change', function () {
    selection.style('stroke-opacity', this.value);
    border_opacity_section.select('#border_opacity_txt').html(+this.value * 100 + '%');
  });

  border_opacity_section.append('span').attr('id', 'border_opacity_txt').style('float', 'right').html(+border_opacity * 100 + '%');

  var border_width_section = popup.append('p').attr('class', 'line_elem');
  border_width_section.append('span').html(i18next.t('app_page.layer_style_popup.border_width'));
  border_width_section.insert('input').attrs({ type: 'number', min: 0, step: 0.1, value: stroke_width }).styles({ width: '60px', float: 'right' }).on('change', function () {
    selection.style('stroke-width', this.value + 'px');
    current_layers[layer_name]['stroke-width-const'] = +this.value;
  });

  var prop_val_content = popup.append('p');
  prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.field_symbol_size', { field: field_used }));
  prop_val_content.append('span').html(i18next.t('app_page.layer_style_popup.symbol_fixed_size'));
  prop_val_content.insert('input').styles({ width: '60px', float: 'right' }).attrs({ type: 'number', id: 'max_size_range', min: 0.1, step: 'any', value: current_layers[layer_name].size[1] }).on('change', function () {
    var f_size = +this.value;
    var prop_values = prop_sizer3_e(d_values, current_layers[layer_name].size[0], f_size, type_symbol);
    current_layers[layer_name].size[1] = f_size;
    redraw_prop_val(prop_values);
  });
  prop_val_content.append('span').style('float', 'right').html('(px)');

  var prop_val_content2 = popup.append('p').attr('class', 'line_elem');
  prop_val_content2.append('span').html(i18next.t('app_page.layer_style_popup.on_value'));
  prop_val_content2.insert('input').styles({ width: '100px', float: 'right' }).attrs({ type: 'number', min: 0.1, step: 0.1, value: +current_layers[layer_name].size[0] }).on('change', function () {
    var f_val = +this.value;
    var prop_values = prop_sizer3_e(d_values, f_val, current_layers[layer_name].size[1], type_symbol);
    redraw_prop_val(prop_values);
    current_layers[layer_name].size[0] = f_val;
  });

  var allow_move_section = popup.append('p');
  var chkbx = allow_move_section.insert('input').style('margin', '0').attrs({
    type: 'checkbox',
    id: 'checkbox_move_symbol',
    checked: current_layers[layer_name].draggable ? true : null });
  allow_move_section.insert('label').attr('for', 'checkbox_move_symbol').html(i18next.t('app_page.layer_style_popup.let_draggable'));
  chkbx.on('change', function () {
    if (this.checked) {
      current_layers[layer_name].draggable = true;
    } else {
      current_layers[layer_name].draggable = false;
    }
  });

  popup.append('p').style('text-align', 'center').insert('button').attrs({ id: 'reset_symb_loc', class: 'button_st4' }).text(i18next.t('app_page.layer_style_popup.reset_symbols_location')).on('click', function () {
    selection.transition().attrs(function (d) {
      var centroid = path.centroid(d.geometry);
      if (type_symbol === 'circle') {
        return {
          cx: centroid[0],
          cy: centroid[1]
        };
      } else {
        return {
          x: centroid[0] - +d.properties.prop_value / 2,
          y: centroid[1] - +d.properties.prop_value / 2
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
  var current_options = {
    size: label_node.style.fontSize,
    content: label_node.textContent,
    font: label_node.style.fontFamily,
    color: label_node.style.fill
  };
  var new_params = {};
  if (current_options.color.startsWith('rgb')) {
    current_options.color = rgb2hex(current_options.color);
  }
  check_remove_existing_box('.styleTextAnnotation');
  make_confirm_dialog2('styleTextAnnotation', i18next.t('app_page.func_options.label.title_box_indiv'), { widthFitContent: true, draggable: true }).then(function (confirmed) {
    if (!confirmed) {
      label_node.style.fontsize = current_options.size; // eslint-disable-line no-param-reassign
      label_node.textContent = current_options.content; // eslint-disable-line no-param-reassign
      label_node.style.fill = current_options.color; // eslint-disable-line no-param-reassign
      label_node.style.fontFamily = current_options.font; // eslint-disable-line no-param-reassign
    }
  });
  var box_content = d3.select('.styleTextAnnotation').select('.modal-content').style('width', '300px').select('.modal-body').insert('div');
  var a = box_content.append('p').attr('class', 'line_elem');
  a.insert('span').html(i18next.t('app_page.func_options.label.font_size'));
  a.append('input').attrs({ type: 'number', id: 'font_size', min: 0, max: 34, step: 'any', value: +label_node.style.fontSize.slice(0, -2) }).styles({ width: '70px', float: 'right' }).on('change', function () {
    label_node.style.fontSize = this.value + 'px'; // eslint-disable-line no-param-reassign
  });
  var b = box_content.append('p').attr('class', 'line_elem');
  b.insert('span').html(i18next.t('app_page.func_options.label.content'));
  b.append('input').attrs({ value: label_node.textContent, id: 'label_content' }).styles({ width: '70px', float: 'right' }).on('keyup', function () {
    label_node.textContent = this.value; // eslint-disable-line no-param-reassign
  });
  var c = box_content.append('p').attr('class', 'line_elem');
  c.insert('span').html(i18next.t('app_page.func_options.common.color'));
  c.append('input').attrs({ type: 'color', value: rgb2hex(label_node.style.fill), id: 'label_color' }).styles({ width: '70px', float: 'right' }).on('change', function () {
    label_node.style.fill = this.value; // eslint-disable-line no-param-reassign
  });
  var d = box_content.append('p').attr('class', 'line_elem');
  d.insert('span').html(i18next.t('app_page.func_options.label.font_type'));
  var selec_fonts = d.append('select').style('float', 'right').on('change', function () {
    label_node.style.fontFamily = this.value; // eslint-disable-line no-param-reassign
  });

  available_fonts.forEach(function (name) {
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
var createDropShadow = function createDropShadow(layerId) {
  var filt_to_use = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filt_to_use.setAttribute('id', 'filt_' + layerId);
  // filt_to_use.setAttribute("x", 0);
  // filt_to_use.setAttribute("y", 0);
  filt_to_use.setAttribute('width', '200%');
  filt_to_use.setAttribute('height', '200%');
  var offset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
  offset.setAttributeNS(null, 'result', 'offOut');
  offset.setAttributeNS(null, 'in', 'SourceAlpha');
  offset.setAttributeNS(null, 'dx', '5');
  offset.setAttributeNS(null, 'dy', '5');
  var gaussian_blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  gaussian_blur.setAttributeNS(null, 'result', 'blurOut');
  gaussian_blur.setAttributeNS(null, 'in', 'offOut');
  gaussian_blur.setAttributeNS(null, 'stdDeviation', 10);
  var blend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
  blend.setAttributeNS(null, 'in', 'SourceGraphic');
  blend.setAttributeNS(null, 'in2', 'blurOut');
  blend.setAttributeNS(null, 'mode', 'normal');
  filt_to_use.appendChild(offset);
  filt_to_use.appendChild(gaussian_blur);
  filt_to_use.appendChild(blend);
  defs.node().appendChild(filt_to_use);
  svg_map.querySelector('#' + layerId).setAttribute('filter', 'url(#filt_' + layerId + ')');
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
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var max = Math.max;
var min = Math.min;
var abs = Math.abs;
var sin = Math.sin;
var cos = Math.cos;
var PI = Math.PI;
var atan2 = Math.atan2;
var sqrt = Math.sqrt;

var UserArrow = function () {
  function UserArrow(id, origin_pt, destination_pt) {
    var parent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
    var untransformed = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    _classCallCheck(this, UserArrow);

    this.parent = parent || svg_map;
    this.svg_elem = d3.select(this.parent);
    this.id = id;
    this.stroke_width = 4;
    this.color = 'rgb(0, 0, 0)';
    this.hide_head = undefined;
    if (!untransformed) {
      var zoom_param = svg_map.__zoom;
      this.pt1 = [(origin_pt[0] - zoom_param.x) / zoom_param.k, (origin_pt[1] - zoom_param.y) / zoom_param.k], this.pt2 = [(destination_pt[0] - zoom_param.x) / zoom_param.k, (destination_pt[1] - zoom_param.y) / zoom_param.k];
    } else {
      this.pt1 = origin_pt;
      this.pt2 = destination_pt;
    }
    var self = this;
    this.drag_behavior = d3.drag().subject(function () {
      // let snap_lines = get_coords_snap_lines(this.id + this.className);
      var t = d3.select(this.querySelector('line'));
      return { x: +t.attr('x2') - +t.attr('x1'),
        y: +t.attr('y2') - +t.attr('y1'),
        x1: t.attr('x1'),
        x2: t.attr('x2'),
        y1: t.attr('y1'),
        y2: t.attr('y2'),
        map_locked: !!map_div.select('#hand_button').classed('locked')
      };
    }).on('start', function () {
      d3.event.sourceEvent.stopPropagation();
      handle_click_hand('lock');
    }).on('end', function () {
      if (d3.event.subject && !d3.event.subject.map_locked) {
        handle_click_hand('unlock');
      }
      // pos_lgds_elem.set(this.id + this.className, this.getBoundingClientRect());
    }).on('drag', function () {
      d3.event.sourceEvent.preventDefault();
      var _t = this.querySelector('line'),
          arrow_head_size = +_t.style.strokeWidth.replace('px', ''),
          subject = d3.event.subject,
          tx = (+d3.event.x - +subject.x) / svg_map.__zoom.k,
          ty = (+d3.event.y - +subject.y) / svg_map.__zoom.k;
      self.pt1 = [+subject.x1 + tx, +subject.y1 + ty];
      self.pt2 = [+subject.x2 + tx, +subject.y2 + ty];
      // if(_app.autoalign_features){
      //     let snap_lines_x = subject.snap_lines.x,
      //         snap_lines_y = subject.snap_lines.y;
      //     for(let i = 0; i < subject.snap_lines.x.length; i++){
      //         if(Math.abs(snap_lines_x[i] - (self.pt1[0] + svg_map.__zoom.x / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: snap_lines_x[i], x2: snap_lines_x[i], y1: 0, y2: h}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[0] = snap_lines_x[i] - svg_map.__zoom.x / svg_map.__zoom.k;
      //         }
      //         if(Math.abs(snap_lines_x[i] - (self.pt2[0] + svg_map.__zoom.x / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: snap_lines_x[i], x2: snap_lines_x[i], y1: 0, y2: h}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           if(self.pt2[0] < self.pt1[0])
      //               arrow_head_size = -arrow_head_size;
      //           self.pt2[0] = snap_lines_x[i] - svg_map.__zoom.x / svg_map.__zoom.k + arrow_head_size;
      //         }
      //         if(Math.abs(snap_lines_y[i] - (self.pt1[1] + svg_map.__zoom.y / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: 0, x2: w, y1: snap_lines_y[i], y2: snap_lines_y[i]}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[1] = snap_lines_y[i] - svg_map.__zoom.y / svg_map.__zoom.k;
      //         }
      //         if(Math.abs(snap_lines_y[i] - (self.pt2[1] + svg_map.__zoom.y / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //                 .attrs({x1: 0, x2: w, y1: snap_lines_y[i], y2: snap_lines_y[i]}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           if(self.pt2[1] < self.pt1[1])
      //               arrow_head_size = -arrow_head_size;
      //           self.pt2[1] = snap_lines_y[i] - svg_map.__zoom.y / svg_map.__zoom.k + arrow_head_size;
      //         }
      //     }
      // }
      _t.x1.baseVal.value = self.pt1[0];
      _t.x2.baseVal.value = self.pt2[0];
      _t.y1.baseVal.value = self.pt1[1];
      _t.y2.baseVal.value = self.pt2[1];
    });

    var markers_exists = defs ? defs.node().querySelector('marker') : null;

    if (!markers_exists) {
      this.add_defs_marker();
    }
    this.draw();
  }

  _createClass(UserArrow, [{
    key: 'add_defs_marker',
    value: function add_defs_marker() {
      defs.append('marker').attrs({ id: 'arrow_head',
        viewBox: '0 -5 10 10',
        refX: 5,
        refY: 0,
        orient: 'auto',
        markerWidth: 4,
        markerHeight: 4 }).style('stroke-width', 1).append('path').attr('d', 'M0,-5L10,0L0,5').attr('class', 'arrowHead');
      if (this.parent.childNodes[0].tagName !== 'defs') {
        this.parent.insertBefore(defs.node(), this.parent.childNodes[0]);
      }
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this = this;

      var context_menu = new ContextMenu(),
          getItems = function getItems() {
        return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
            _this.editStyle();
          } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
            _this.up_element();
          } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
            _this.down_element();
          } }, { name: i18next.t('app_page.common.delete'), action: function action() {
            _this.remove();
          } }];
      };

      this.arrow = this.svg_elem.append('g').style('cursor', 'all-scroll').attrs({ class: 'arrow legend scalable-legend', id: this.id, transform: svg_map.__zoom.toString() });

      this.arrow.insert('line').attrs({
        'marker-end': this.hide_head ? null : 'url(#arrow_head)',
        x1: this.pt1[0],
        y1: this.pt1[1],
        x2: this.pt2[0],
        y2: this.pt2[1] }).styles({ 'stroke-width': this.stroke_width, stroke: 'rgb(0, 0, 0)' });

      this.arrow.call(this.drag_behavior);

      this.arrow.on('contextmenu', function () {
        context_menu.showMenu(d3.event, document.querySelector('body'), getItems());
      });
      this.arrow.on('dblclick', function () {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        _this.handle_ctrl_pt();
      });
    }
  }, {
    key: 'remove',
    value: function remove() {
      // pos_lgds_elem.delete(this.arrow.attr('id'));
      this.arrow.remove();
    }
  }, {
    key: 'up_element',
    value: function up_element() {
      up_legend(this.arrow.node());
    }
  }, {
    key: 'down_element',
    value: function down_element() {
      down_legend(this.arrow.node());
    }
  }, {
    key: 'handle_ctrl_pt',
    value: function handle_ctrl_pt() {
      var self = this,
          line = self.arrow.node().querySelector('line'),
          zoom_params = svg_map.__zoom,
          map_locked = !!map_div.select('#hand_button').classed('locked'),
          msg = alertify.notify(i18next.t('app_page.notification.instruction_modify_feature'), 'warning', 0);

      // New behavior if the user click on the lock to move on the map :
      var cleanup_edit_state = function cleanup_edit_state() {
        edit_layer.remove();
        msg.dismiss();
        self.pt1 = [line.x1.baseVal.value, line.y1.baseVal.value];
        self.pt2 = [line.x2.baseVal.value, line.y2.baseVal.value];

        // Reactive the ability to move the arrow :
        self.arrow.call(self.drag_behavior);
        // Restore the ability to edit the control points on dblclick on the arrow :
        self.arrow.on('dblclick', function () {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          self.handle_ctrl_pt();
        });
        if (!map_locked) {
          handle_click_hand('unlock');
        }
        // Restore the previous behiavor for the 'lock' button :
        document.getElementById('hand_button').onclick = handle_click_hand;
      };

      // Change the behavior of the 'lock' button :
      document.getElementById('hand_button').onclick = function () {
        cleanup_edit_state();
        handle_click_hand();
      };
      // Desactive the ability to drag the arrow :
      self.arrow.on('.drag', null);
      // Desactive the ability to zoom/move on the map ;
      handle_click_hand('lock');

      // Add a layer to intercept click on the map :
      var edit_layer = map.insert('g');
      edit_layer.append('rect').attrs({ x: 0, y: 0, width: w, height: h, class: 'edit_rect' }).style('fill', 'transparent').on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });

      // Append two red squares for the start point and the end point of the arrow :
      edit_layer.append('rect').attrs({ x: self.pt1[0] * zoom_params.k + zoom_params.x - 3, y: self.pt1[1] * zoom_params.k + zoom_params.y - 3, height: 6, width: 6, id: 'arrow_start_pt' }).styles({ fill: 'red', cursor: 'grab' }).call(d3.drag().on('drag', function () {
        var t = d3.select(this),
            nx = d3.event.x,
            ny = d3.event.y;
        t.attrs({ x: nx - 3, y: ny - 3 });
        line.x1.baseVal.value = (nx - zoom_params.x) / zoom_params.k;
        line.y1.baseVal.value = (ny - zoom_params.y) / zoom_params.k;
      }));
      edit_layer.append('rect').attrs({ x: self.pt2[0] * zoom_params.k + zoom_params.x - 3, y: self.pt2[1] * zoom_params.k + zoom_params.y - 3, height: 6, width: 6, id: 'arrow_end_pt' }).styles({ fill: 'red', cursor: 'grab' }).call(d3.drag().on('drag', function () {
        var t = d3.select(this),
            nx = d3.event.x,
            ny = d3.event.y;
        t.attrs({ x: nx - 3, y: ny - 3 });
        line.x2.baseVal.value = (nx - zoom_params.x) / zoom_params.k;
        line.y2.baseVal.value = (ny - zoom_params.y) / zoom_params.k;
      }));

      // Exit the "edit" state by double clicking again on the arrow :
      self.arrow.on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });
    }
  }, {
    key: 'calcAngle',
    value: function calcAngle() {
      var dx = this.pt2[0] - this.pt1[0],
          dy = this.pt2[1] - this.pt1[1];
      return atan2(dy, dx) * (180 / PI);
    }
  }, {
    key: 'calcDestFromOAD',
    value: function calcDestFromOAD(origin, angle, distance) {
      var theta = angle / (180 / PI),
          dx = distance * cos(theta),
          dy = distance * sin(theta);
      return [origin[0] + dx, origin[1] + dy];
    }
  }, {
    key: 'editStyle',
    value: function editStyle() {
      var current_options = { pt1: this.pt1.slice(),
        pt2: this.pt2.slice() };
      var self = this,
          line = self.arrow.node().querySelector('line'),
          angle = (-this.calcAngle()).toFixed(0),
          map_locked = !!map_div.select('#hand_button').classed('locked');

      if (!map_locked) handle_click_hand('lock');

      check_remove_existing_box('.styleBoxArrow');

      make_confirm_dialog2('styleBoxArrow', i18next.t('app_page.arrow_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
        if (confirmed) {
          // Store shorcut of useful values :
          self.stroke_width = line.style.strokeWidth;
          self.color = line.style.stroke;
          self.pt1 = [line.x1.baseVal.value, line.y1.baseVal.value];
          self.pt2 = [line.x2.baseVal.value, line.y2.baseVal.value];
        } else {
          // Rollback on initials parameters :
          line.x1.baseVal.value = current_options.pt1[0];
          line.y1.baseVal.value = current_options.pt1[1];
          line.x2.baseVal.value = current_options.pt2[0];
          line.y2.baseVal.value = current_options.pt2[1];
          self.pt1 = current_options.pt1.slice();
          self.pt2 = current_options.pt2.slice();
          line.style.strokeWidth = self.stroke_width;
          line.style.stroke = self.color;
        }
        map.select('#arrow_start_pt').remove();
        map.select('#arrow_end_pt').remove();
        if (!map_locked) handle_click_hand('unlock');
      });

      var box_content = d3.select('.styleBoxArrow').select('.modal-body').style('width', '295px').insert('div').attr('id', 'styleBoxArrow');
      var s1 = box_content.append('p').attr('class', 'line_elem2');
      s1.append('span').html(i18next.t('app_page.arrow_edit_box.arrowWeight'));
      s1.insert('span').styles({ float: 'right', width: '13px' }).html('px');
      s1.insert('input').attrs({ id: 'arrow_weight_text', class: 'without_spinner', value: self.stroke_width, min: 0, max: 34, step: 0.1 }).styles({ width: '30px', 'margin-left': '10px', float: 'right' }).on('input', function () {
        var elem = document.getElementById('arrow_stroke_width');
        elem.value = this.value;
        elem.dispatchEvent(new Event('change'));
      });

      s1.append('input').attrs({ type: 'range', id: 'arrow_stroke_width', min: 0, max: 34, step: 0.1, value: self.stroke_width }).styles({ width: '80px', 'vertical-align': 'middle', float: 'right' }).on('change', function () {
        line.style.strokeWidth = this.value;
        document.getElementById('arrow_weight_text').value = +this.value;
      });

      var s2 = box_content.append('p').attr('class', 'line_elem2');
      s2.append('span').html(i18next.t('app_page.arrow_edit_box.arrowAngle'));
      s2.insert('span').styles({ float: 'right', width: '13px' }).html('&nbsp;°');
      s2.insert('input').attrs({ id: 'arrow_angle_text', class: 'without_spinner', value: angle, min: 0, max: 1, step: 1 }).styles({ width: '30px', 'margin-left': '10px', float: 'right' }).on('input', function () {
        var elem = document.getElementById('arrow_angle');
        elem.value = this.value;
        elem.dispatchEvent(new Event('change'));
      });
      s2.insert('input').attrs({ id: 'arrow_angle', type: 'range', value: angle, min: 0, max: 360, step: 1 }).styles({ width: '80px', 'vertical-align': 'middle', float: 'right' }).on('change', function () {
        var distance = sqrt((self.pt1[0] - self.pt2[0]) * (self.pt1[0] - self.pt2[0]) + (self.pt1[1] - self.pt2[1]) * (self.pt1[1] - self.pt2[1]));
        var _angle = -+this.value;

        var _self$calcDestFromOAD = self.calcDestFromOAD(self.pt1, _angle, distance),
            _self$calcDestFromOAD2 = _slicedToArray(_self$calcDestFromOAD, 2),
            nx = _self$calcDestFromOAD2[0],
            ny = _self$calcDestFromOAD2[1];

        line.x2.baseVal.value = nx;
        line.y2.baseVal.value = ny;
        document.getElementById('arrow_angle_text').value = +this.value;
      });
      var s3 = box_content.append('p').attr('class', 'line_elem2');
      s3.append('label').attrs({ for: 'checkbox_head_arrow' }).html(i18next.t('app_page.arrow_edit_box.arrowHead'));
      s3.append('input').attrs({ type: 'checkbox', id: 'checkbox_head_arrow' }).styles({ 'margin-left': '45px', 'vertical-align': 'middle' }).property('checked', self.hide_head === true).on('change', function () {
        if (this.checked) {
          self.hide_head = true;
          self.arrow.select('line').attr('marker-end', null);
        } else {
          self.hide_head = false;
          self.arrow.select('line').attr('marker-end', 'url(#arrow_head)');
        }
      });
    }
  }]);

  return UserArrow;
}();

var Textbox = function () {
  function Textbox(parent, id_text_annot) {
    var _this2 = this;

    var position = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [10, 30];

    _classCallCheck(this, Textbox);

    var self = this;
    this.x = position[0];
    this.y = position[1];
    this.fontSize = 14;
    var context_menu = new ContextMenu();
    var getItems = function getItems() {
      return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
          _this2.editStyle();
        } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
          _this2.up_element();
        } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
          _this2.down_element();
        } }, { name: i18next.t('app_page.common.delete'), action: function action() {
          _this2.remove();
        } }];
    };
    var drag_txt_annot = d3.drag().subject(function () {
      var t = d3.select(this).select('text');
      var snap_lines = get_coords_snap_lines(this.id);
      return {
        x: t.attr('x'),
        y: t.attr('y'),
        map_locked: !!map_div.select('#hand_button').classed('locked'),
        snap_lines: snap_lines
      };
    }).on('start', function () {
      d3.event.sourceEvent.stopPropagation();
      handle_click_hand('lock');
    }).on('end', function () {
      if (d3.event.subject && !d3.event.subject.map_locked) {
        handle_click_hand('unlock');
      }
      pos_lgds_elem.set(this.id, this.getBoundingClientRect());
    }).on('drag', function () {
      d3.event.sourceEvent.preventDefault();
      var elem = d3.select(this).select('text').attrs({ x: +d3.event.x, y: +d3.event.y });
      var transform = elem.attr('transform');
      if (transform) {
        var v = +transform.match(/[-.0-9]+/g)[0];
        elem.attr('transform', 'rotate(' + v + ', ' + (d3.event.x + self.width) + ', ' + (d3.event.y + self.height) + ')');
      }
      elem.selectAll('tspan').attr('x', +d3.event.x);

      if (_app.autoalign_features) {
        (function () {
          var t = elem.node();
          var bbox = t.getBoundingClientRect(),
              xmin = t.x.baseVal.value,
              xmax = xmin + bbox.width,
              ymin = t.y.baseVal.value,
              ymax = ymin + bbox.height,
              snap_lines_x = d3.event.subject.snap_lines.x,
              snap_lines_y = d3.event.subject.snap_lines.y;

          var _loop = function _loop(i) {
            if (abs(snap_lines_x[i][0] - xmin) < 10) {
              var _y1 = min(min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
              var _y2 = max(max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
              make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y1, _y2);
              Array.prototype.forEach.call(t.querySelectorAll('tspan'), function (el) {
                el.x.baseVal.value = snap_lines_x[i][0];
              });
            }
            if (abs(snap_lines_x[i][0] - xmax) < 10) {
              var _y = min(min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
              var _y3 = max(max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
              make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y, _y3);
              Array.prototype.forEach.call(t.querySelectorAll('tspan'), function (el) {
                el.x.baseVal.value = snap_lines_x[i][0] - bbox.width;
              });
            }
            if (abs(snap_lines_y[i][0] - ymin) < 10) {
              var x1 = min(min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
              var x2 = max(max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
              make_red_line_snap(x1, x2, snap_lines_y[i][0], snap_lines_y[i][0]);
              t.y.baseVal.value = snap_lines_y[i][0];
            }
            if (abs(snap_lines_y[i][0] - ymax) < 10) {
              var _x5 = min(min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
              var _x6 = max(max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
              make_red_line_snap(_x5, _x6, snap_lines_y[i][0], snap_lines_y[i][0]);
              t.y.baseVal.value = snap_lines_y[i][0] - bbox.height;
            }
          };

          for (var i = 0; i < snap_lines_x.length; i++) {
            _loop(i);
          }
        })();
      }
      elem.attr('x', elem.select('tspan').attr('x'));
      self.x = elem.attr('x');
      self.y = elem.attr('y');
      if (transform) {
        var _v = +transform.match(/[-.0-9]+/g)[0];
        elem.attr('transform', 'rotate(' + _v + ', ' + self.x + ', ' + self.y + ')');
      }
      self.update_bbox();
    });
    var group_elem = map.append('g').attrs({ id: id_text_annot, class: 'legend txt_annot' }).styles({ cursor: 'pointer' }).on('mouseover', function () {
      under_rect.style('fill-opacity', 0.1);
    }).on('mouseout', function () {
      under_rect.style('fill-opacity', 0);
    });
    var under_rect = group_elem.append('rect').styles({ fill: 'green', 'fill-opacity': 0 });
    var text_elem = group_elem.append('text').attrs({ x: this.x, y: this.y, id: ['in_', id_text_annot].join('') }).styles({
      'font-size': this.fontSize + 'px',
      'font-family': 'Arial,Helvetica,sans-serif',
      'text-anchor': 'start'
    });
    text_elem.append('tspan').attr('x', this.x).text(i18next.t('app_page.text_box_edit_box.constructor_default'));
    group_elem.call(drag_txt_annot);
    group_elem.on('dblclick', function () {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      _this2.editStyle();
    }).on('contextmenu', function () {
      context_menu.showMenu(d3.event, document.querySelector('body'), getItems());
    });

    this.lineHeight = Math.round(this.fontSize * 1.4);
    this.textAnnot = text_elem;
    this.group = group_elem;
    this.fontFamily = 'Verdana,Geneva,sans-serif';
    this.anchor = 'start';
    this.buffer = undefined;
    this.id = id_text_annot;

    this.update_bbox();
    pos_lgds_elem.set(this.id, group_elem.node().getBoundingClientRect());
  }

  _createClass(Textbox, [{
    key: 'remove',
    value: function remove() {
      pos_lgds_elem.delete(this.group.attr('id'));
      this.group.remove();
    }
  }, {
    key: 'update_text',
    value: function update_text(new_content) {
      var split = new_content.split('\n');
      this.textAnnot.selectAll('tspan').remove();
      for (var i = 0; i < split.length; i++) {
        this.textAnnot.append('tspan').attr('x', this.x).attr('dy', i === 0 ? null : this.lineHeight).html(split[i]);
      }
      this.update_bbox();
    }
  }, {
    key: 'get_text_content',
    value: function get_text_content() {
      var content = [];
      this.textAnnot.selectAll('tspan').each(function () {
        content.push(this.innerHTML);
      });
      return content.join('\n');
    }
  }, {
    key: 'update_bbox',
    value: function update_bbox() {
      var bbox = this.textAnnot.node().getBoundingClientRect();

      var _get_map_xy = get_map_xy0(),
          x0 = _get_map_xy.x,
          y0 = _get_map_xy.y;

      this.width = bbox.width;
      this.height = bbox.height;
      this.group.select('rect').attrs({ x: bbox.left - x0 - 10,
        y: bbox.top - y0 - 10,
        height: this.height + 20,
        width: this.width + 20 });
    }
  }, {
    key: 'editStyle',
    value: function editStyle() {
      var _this3 = this;

      var map_xy0 = get_map_xy0();
      var self = this;
      var text_elem = self.textAnnot;
      check_remove_existing_box('.styleTextAnnotation');

      var current_options = {
        size: self.fontSize,
        color: text_elem.style('fill'),
        content: unescape(this.get_text_content()),
        transform_rotate: text_elem.attr('transform'),
        x: text_elem.attr('x'),
        y: text_elem.attr('y'),
        font_weight: text_elem.style('font-weight'),
        font_style: text_elem.style('font-style'),
        text_decoration: text_elem.style('text-decoration'),
        buffer: self.buffer !== undefined ? cloneObj(self.buffer) : undefined,
        text_shadow: text_elem.style('text-shadow'),
        font_family: self.fontFamily
      };
      current_options.font_weight = current_options.font_weight === '400' || current_options.font_weight === '' ? '' : 'bold';
      make_confirm_dialog2('styleTextAnnotation', i18next.t('app_page.text_box_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
        if (!confirmed) {
          text_elem.styles({
            color: current_options.color,
            'font-size': current_options.size + 'px',
            'font-weight': current_options.font_weight,
            'text-decoration': current_options.text_decoration,
            'font-style': current_options.font_style,
            'text-shadow': current_options.text_shadow
          });
          self.fontSize = current_options.size;
          self.fontFamily = current_options.font_family;
          text_elem.attr('transform', current_options.transform_rotate);
          self.buffer = current_options.buffer;
          _this3.update_text(current_options.content);
        } else if (!buffer_txt_chk.node().checked) {
          self.buffer = undefined;
        }
      });
      var box_content = d3.select('.styleTextAnnotation').select('.modal-body').style('width', '295px').insert('div').attr('id', 'styleTextAnnotation');

      var current_rotate = typeof current_options.transform_rotate === 'string' ? current_options.transform_rotate.match(/[-.0-9]+/g) : 0;
      if (current_rotate && current_rotate.length === 3) {
        current_rotate = +current_rotate[0];
      } else {
        current_rotate = 0;
      }

      var bbox = text_elem.node().getBoundingClientRect(),
          nx = bbox.left - map_xy0.x,
          ny = bbox.top - map_xy0.y,
          x_center = nx + bbox.width / 2,
          y_center = ny + bbox.height / 2;

      var option_rotation = box_content.append('p').attr('class', 'line_elem2');
      option_rotation.append('span').html(i18next.t('app_page.text_box_edit_box.rotation'));
      option_rotation.append('span').style('float', 'right').html(' °');
      option_rotation.append('input').attrs({
        type: 'number',
        min: 0,
        max: 360,
        step: 'any',
        value: current_rotate,
        class: 'without_spinner',
        id: 'textbox_txt_rotate' }).styles({ width: '40px', float: 'right' }).on('change', function () {
        var rotate_value = +this.value;
        text_elem.attrs({ x: nx, y: ny, transform: 'rotate(' + [rotate_value, x_center, y_center] + ')' });
        text_elem.selectAll('tspan').attr('x', nx);
        document.getElementById('textbox_range_rotate').value = rotate_value;
      });

      option_rotation.append('input').attrs({ type: 'range', min: 0, max: 360, step: 0.1, id: 'textbox_range_rotate', value: current_rotate }).styles({ 'vertical-align': 'middle', width: '100px', float: 'right', margin: 'auto 10px' }).on('change', function () {
        var rotate_value = +this.value;
        text_elem.attrs({ x: nx, y: ny, transform: 'rotate(' + [rotate_value, x_center, y_center] + ')' });
        text_elem.selectAll('tspan').attr('x', nx);
        document.getElementById('textbox_txt_rotate').value = rotate_value;
      });

      var options_font = box_content.append('p');
      var font_select = options_font.insert('select').on('change', function () {
        text_elem.style('font-family', this.value);
        self.fontFamily = this.value;
      });

      available_fonts.forEach(function (font) {
        font_select.append('option').text(font[0]).attr('value', font[1]);
      });
      font_select.node().selectedIndex = available_fonts.map(function (d) {
        return d[1] === self.fontFamily ? '1' : '0';
      }).indexOf('1');

      options_font.append('input').attrs({ type: 'number', id: 'font_size', min: 0, max: 34, step: 0.1, value: self.fontSize }).styles({ width: '60px', margin: '0 15px' }).on('change', function () {
        self.fontSize = +this.value;
        self.lineHeight = Math.round(self.fontSize * 1.4);
        text_elem.style('font-size', self.fontSize + 'px');
        text_elem.selectAll('tspan').each(function (d, i) {
          if (i !== 0) {
            d3.select(this).attr('dy', self.lineHeight);
          }
        });
      });

      options_font.append('input').attrs({ type: 'color', id: 'font_color', value: rgb2hex(current_options.color) }).style('width', '60px').on('change', function () {
        text_elem.style('fill', this.value);
      });

      var options_format = box_content.append('p').style('text-align', 'center');
      var btn_bold = options_format.insert('span').attr('class', current_options.font_weight === 'bold' ? 'active button_disc' : 'button_disc').html('<img title="Bold" src="data:image/gif;base64,R0lGODlhFgAWAID/AMDAwAAAACH5BAEAAAAALAAAAAAWABYAQAInhI+pa+H9mJy0LhdgtrxzDG5WGFVk6aXqyk6Y9kXvKKNuLbb6zgMFADs=">');
      var btn_italic = options_format.insert('span').attr('class', current_options.font_style === 'italic' ? 'active button_disc' : 'button_disc').html('<img title="Italic" src="data:image/gif;base64,R0lGODlhFgAWAKEDAAAAAF9vj5WIbf///yH5BAEAAAMALAAAAAAWABYAAAIjnI+py+0Po5x0gXvruEKHrF2BB1YiCWgbMFIYpsbyTNd2UwAAOw==">');
      var btn_underline = options_format.insert('span').attr('class', current_options.text_decoration === 'underline' ? 'active button_disc' : 'button_disc').html('<img title="Underline" src="data:image/gif;base64,R0lGODlhFgAWAKECAAAAAF9vj////////yH5BAEAAAIALAAAAAAWABYAAAIrlI+py+0Po5zUgAsEzvEeL4Ea15EiJJ5PSqJmuwKBEKgxVuXWtun+DwxCCgA7">');

      var content_modif_zone = box_content.append('p');
      content_modif_zone.append('span').html(i18next.t('app_page.text_box_edit_box.content'));
      var right = content_modif_zone.append('span').attr('class', 'align-option').styles({ 'font-size': '11px', 'font-weight': '', 'margin-left': '10px', float: 'right' }).html('right').on('click', function () {
        content_modif_zone.selectAll('.align-option').style('font-weight', '');
        right.style('font-weight', 'bold').style('font-size', '12px');
        text_elem.style('text-anchor', 'end');
        self.anchor = 'end';
        self.update_bbox();
      });
      var center = content_modif_zone.append('span').styles({ 'font-size': '11px', 'font-weight': '', 'margin-left': '10px', float: 'right' }).attr('class', 'align-option').html('center').on('click', function () {
        content_modif_zone.selectAll('.align-option').style('font-weight', '');
        center.style('font-weight', 'bold').style('font-size', '12px');
        text_elem.style('text-anchor', 'middle');
        self.anchor = 'middle';
        self.update_bbox();
      });
      var left = content_modif_zone.append('span').styles({ 'font-size': '11px', 'font-weight': '', 'margin-left': '10px', float: 'right' }).attr('class', 'align-option').html('left').on('click', function () {
        content_modif_zone.selectAll('.align-option').style('font-weight', '').style('font-size', '11px');
        left.style('font-weight', 'bold').style('font-size', '12px');
        text_elem.style('text-anchor', 'start');
        self.anchor = 'start';
        self.update_bbox();
      });
      var selected = self.anchor === 'start' ? left : self.anchor === 'middle' ? center : right;
      selected.style('font-weight', 'bold').style('font-size', '12px');

      content_modif_zone.append('span').html('<br>');
      content_modif_zone.append('textarea').attr('id', 'annotation_content').styles({ margin: '5px 0px 0px', width: '100%' }).on('keyup', function () {
        self.update_text(this.value);
      });
      document.getElementById('annotation_content').value = current_options.content;

      var buffer_text_zone = box_content.append('p');
      var buffer_txt_chk = buffer_text_zone.append('input').attrs({ type: 'checkbox', id: 'buffer_txt_chk', checked: current_options.buffer !== undefined ? true : null }).on('change', function () {
        if (this.checked) {
          buffer_color.style('display', '');
          if (self.buffer === undefined) {
            self.buffer = { color: '#FFFFFF', size: 1 };
          }
          var color = self.buffer.color,
              size = self.buffer.size;
          text_elem.style('text-shadow', '-' + size + 'px 0px 0px ' + color + ', 0px ' + size + 'px 0px ' + color + ', ' + size + 'px 0px 0px ' + color + ', 0px -' + size + 'px 0px ' + color);
        } else {
          buffer_color.style('display', 'none');
          text_elem.style('text-shadow', 'none');
        }
      });

      buffer_text_zone.append('label').attrs({ for: 'buffer_txt_chk' }).text(i18next.t('app_page.text_box_edit_box.buffer'));

      var buffer_color = buffer_text_zone.append('input').style('float', 'right').style('display', current_options.buffer !== undefined ? '' : 'none').attrs({ type: 'color', value: current_options.buffer !== undefined ? current_options.buffer.color : '#FFFFFF' }).on('change', function () {
        self.buffer.color = this.value;
        var color = self.buffer.color,
            size = self.buffer.size;
        text_elem.style('text-shadow', '-' + size + 'px 0px 0px ' + color + ', 0px ' + size + 'px 0px ' + color + ', ' + size + 'px 0px 0px ' + color + ', 0px -' + size + 'px 0px ' + color);
      });

      btn_bold.on('click', function () {
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          text_elem.style('font-weight', '');
        } else {
          this.classList.add('active');
          text_elem.style('font-weight', 'bold');
        }
      });

      btn_italic.on('click', function () {
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          text_elem.style('font-style', '');
        } else {
          this.classList.add('active');
          text_elem.style('font-style', 'italic');
        }
      });

      btn_underline.on('click', function () {
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          text_elem.style('text-decoration', '');
        } else {
          this.classList.add('active');
          text_elem.style('text-decoration', 'underline');
        }
      });
    }
  }, {
    key: 'up_element',
    value: function up_element() {
      up_legend(this.group.node());
    }
  }, {
    key: 'down_element',
    value: function down_element() {
      down_legend(this.group.node());
    }
  }]);

  return Textbox;
}();

/**
* Handler for the scale bar (only designed for one scale bar)
*
*/


var scaleBar = {
  create: function create(x, y) {
    var _this4 = this;

    // if (!proj.invert) {
    //   swal({ title: '',
    //     text: i18next.t('app_page.common.error_interrupted_projection_scalebar'),
    //     type: 'error',
    //     allowOutsideClick: false,
    //     allowEscapeKey: false,
    //   }).then(() => { null; }, () => { null; });
    //   return;
    // }
    var scale_gp = map.append('g').attr('id', 'scale_bar').attr('class', 'legend scale'),
        x_pos = 40,
        y_pos = h - 100,
        bar_size = 50,
        self = this;

    this.x = x_pos;
    this.y = y_pos;
    this.bar_size = bar_size;
    this.unit = 'km';
    this.precision = 0;
    this.start_end_bar = false;
    this.fixed_size = false;
    var rv = this.getDist();
    if (rv) return;

    var getItems = function getItems() {
      return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
          _this4.editStyle();
        } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
          _this4.up_element();
        } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
          _this4.down_element();
        } }, { name: i18next.t('app_page.common.delete'), action: function action() {
          _this4.remove();
        } }];
    };

    var scale_context_menu = new ContextMenu();
    this.under_rect = scale_gp.insert('rect').attrs({ x: x_pos - 10, y: y_pos - 20, height: 30, width: this.bar_size + 20, id: 'under_rect' }).styles({ fill: 'green', 'fill-opacity': 0 });
    scale_gp.insert('rect').attr('id', 'rect_scale').attrs({ x: x_pos, y: y_pos, height: 2, width: this.bar_size }).style('fill', 'black');
    scale_gp.insert('text').attr('id', 'text_limit_sup_scale').attrs({ x: x_pos + bar_size, y: y_pos - 5 }).styles({ font: '11px \'Enriqueta\', arial, serif',
      'text-anchor': 'middle' }).text(this.dist_txt + ' km');

    scale_gp.call(drag_legend_func(scale_gp));
    scale_gp.on('mouseover', function () {
      this.style.cursor = 'pointer';
      self.under_rect.style('fill-opacity', 0.1);
    }).on('mouseout', function () {
      this.style.cursor = 'pointer';
      self.under_rect.style('fill-opacity', 0);
    }).on('contextmenu dblclick', function (d, i) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      return scale_context_menu.showMenu(d3.event, document.querySelector('body'), getItems());
    });
    if (x && y) {
      scale_gp.attr('transform', 'translate(' + [x - this.x, y - this.y] + ')');
    }
    this.Scale = scale_gp;
    this.displayed = true;
    if (this.dist > 100) {
      this.resize(Math.round(this.dist / 100) * 100);
    } else if (this.dist > 10) {
      this.resize(Math.round(this.dist / 10) * 10);
    } else if (Math.round(this.dist) > 1) {
      this.resize(Math.round(this.dist));
    } else if (Math.round(this.dist * 10) / 10 > 0.1) {
      this.precision = 1;
      this.resize(Math.round(this.dist * 10) / 10);
    } else {
      var t = this.dist.toString().split('.');
      this.precision = t && t.length > 1 ? t[1].length : ('' + this.dist).length;
      this.resize(this.dist);
    }
    pos_lgds_elem.set(scale_gp.attr('id') + ' ' + scale_gp.attr('class'), scale_gp.node().getBoundingClientRect());
  },
  getDist: function getDist() {
    var x_pos = w / 2,
        y_pos = h / 2,
        transform = d3.zoomTransform(svg_map),
        z_trans = [transform.x, transform.y],
        z_scale = transform.k;

    if (isNaN(this.bar_size)) {
      console.log('scaleBar.bar_size : NaN');
      this.bar_size = 50;
    }

    var pt1 = proj.invert([(x_pos - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]),
        pt2 = proj.invert([(x_pos + this.bar_size - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]);
    if (!pt1 || !pt2) {
      this.remove();
      return true;
    }
    this.dist = coslaw_dist([pt1[1], pt1[0]], [pt2[1], pt2[0]]);
    var mult = this.unit == 'km' ? 1 : this.unit == 'm' ? 1000 : this.unit == 'mi' ? 0.621371 : 1;
    this.dist_txt = (this.dist * mult).toFixed(this.precision);
  },
  resize: function resize(desired_dist) {
    desired_dist = desired_dist || this.fixed_size;
    var ratio = +this.dist / desired_dist;
    var new_size = this.bar_size / ratio;

    this.Scale.select('#rect_scale').attr('width', new_size);
    this.Scale.select('#text_limit_sup_scale').attr('x', this.x + new_size / 2);
    this.bar_size = new_size;
    this.fixed_size = desired_dist;
    this.under_rect.attr('width', new_size + 20);
    var err = this.getDist();
    if (err) {
      this.remove();
      return;
    }
    this.Scale.select('#text_limit_sup_scale').text(this.fixed_size + ' ' + this.unit);
    this.handle_start_end_bar();
  },
  update: function update() {
    var err = this.getDist();
    if (err) {
      this.remove();
      return;
    }
    if (this.fixed_size) {
      this.resize();
    } else {
      this.Scale.select('#text_limit_sup_scale').text(this.dist_txt + ' ' + this.unit);
    }
  },
  up_element: function up_element() {
    up_legend(this.Scale.node());
  },
  down_element: function down_element() {
    down_legend(this.Scale.node());
  },
  remove: function remove() {
    pos_lgds_elem.delete(this.Scale.attr('id') + ' ' + this.Scale.attr('class'));
    this.Scale.remove();
    this.Scale = null;
    this.displayed = false;
  },
  handle_start_end_bar: function handle_start_end_bar() {
    this.Scale.selectAll('.se_bar').remove();
    if (this.start_end_bar) {
      this.Scale.insert('rect').attrs({ class: 'start_bar se_bar', x: this.x, y: this.y - 4.5, width: '1.5px', height: '4.5px' });

      this.Scale.insert('rect').attrs({ class: 'end_bar se_bar', x: this.x + this.bar_size - 1.5, y: this.y - 4.5, width: '1.5px', height: '4.5px' });
    }
  },
  editStyle: function editStyle() {
    var new_val = void 0;
    var self = this,
        redraw_now = function redraw_now() {
      if (new_val) {
        self.resize(new_val);
      } else {
        self.fixed_size = false;
        self.update();
      }
    };
    make_confirm_dialog2('scaleBarEditBox', i18next.t('app_page.scale_bar_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
      if (confirmed) {
        redraw_now();
      }
    });
    var box_body = d3.select('.scaleBarEditBox').select('.modal-body').style('width', '295px');
    // box_body.node().parentElement.style.width = "auto";
    box_body.append('h3').html(i18next.t('app_page.scale_bar_edit_box.title'));
    var a = box_body.append('p').attr('class', 'line_elem2');
    a.append('span').html(i18next.t('app_page.scale_bar_edit_box.fixed_size'));
    a.append('input').style('float', 'right').attrs({ id: 'scale_fixed_field', type: 'number', disabled: self.fixed_size ? null : true, value: +this.dist_txt }).on('change', function () {
      new_val = +this.value;
      redraw_now();
    });
    a.append('input').style('float', 'right').attrs({ type: 'checkbox', checked: self.fixed_size ? true : null }).on('change', function () {
      if (box_body.select('#scale_fixed_field').attr('disabled')) {
        box_body.select('#scale_fixed_field').attr('disabled', null);
        new_val = +box_body.select('#scale_fixed_field').attr('value');
      } else {
        box_body.select('#scale_fixed_field').attr('disabled', true);
        new_val = false;
      }
      redraw_now();
    });

    var b = box_body.append('p').attr('class', 'line_elem2');
    b.insert('span').html(i18next.t('app_page.scale_bar_edit_box.precision'));
    b.insert('input').style('float', 'right').attrs({ id: 'scale_precision', type: 'number', min: 0, max: 6, step: 1, value: +this.precision }).style('width', '60px').on('change', function () {
      self.precision = +this.value;
      redraw_now();
    });

    var c = box_body.append('p').attr('class', 'line_elem2');
    c.insert('span').html(i18next.t('app_page.scale_bar_edit_box.unit'));
    var unit_select = c.insert('select').style('float', 'right').attr('id', 'scale_unit').on('change', function () {
      self.unit = this.value;
      redraw_now();
    });
    unit_select.append('option').text('km').attr('value', 'km');
    unit_select.append('option').text('m').attr('value', 'm');
    unit_select.append('option').text('mi').attr('value', 'mi');
    unit_select.node().value = self.unit;

    var e = box_body.append('p').attr('class', 'line_elem2');
    e.append('span').html(i18next.t('app_page.scale_bar_edit_box.start_end_bar'));
    e.append('input').style('float', 'right').attrs({ id: 'checkbox_start_end_bar', type: 'checkbox' }).on('change', function (_) {
      self.start_end_bar = self.start_end_bar !== true;
      self.handle_start_end_bar();
    });
    document.getElementById('checkbox_start_end_bar').checked = self.start_end_bar;
  },

  displayed: false
};

var northArrow = {
  display: function display(x, y) {
    var _this5 = this;

    var x_pos = x || w - 100,
        y_pos = y || h - 100,
        self = this;

    var arrow_gp = map.append('g').attrs({ id: 'north_arrow', class: 'legend', scale: 1, rotate: null }).style('cursor', 'all-scroll');

    this.svg_node = arrow_gp;
    this.displayed = true;

    this.arrow_img = arrow_gp.insert('image').attrs({ x: x_pos, y: y_pos, height: '30px', width: '30px' }).attr('xlink:href', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABVCAYAAAD5cuL2AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAVjwAAFY8BlpPm3wAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAWvSURBVHic7ZxtiFVFGMd/e3W3dJdyFWpVSipcYiNrMYhACWspKLOICqPCKOyF7EXK0sIMytKSIoperKg2I+lDEJYIQWC1RAW1ZST2IlHZi1qxYi+7dO7twzNn773nnnPuOWfOzNxd7x/OhztnZp7//M+cmXmemXOhiSaaMICbge8C18KEZa8LKXuaAY4ATDRUbydwfCBtI3AS8GedslNCyh6eE68aFExVHILpwMMW7SWCTQEArgXOsWwzFrYFaEFehQ7LdiNhWwCAWcBaB3ZD4UIAgGXAfEe2q+BKgALwPDDJkf0qIrbwe+B3N7DGov1Q2BRgBTASSLsdg4ucJLApwA7goUDaROAFoM0ijyrYHgMeRISoxBxgpWUeo7AtwAiwBPgvkH4PcLJlLoCbWeAz4LFAWhvwMuZ8k0i4mgZXAzsDab3AbbaJuBJgGPELioH0B4ATbRJxJQDAh8DTgbTDkDHCGlwKAHAXsDuQZpWTawH+ApYCJVcEXAsA8C7wkivjjSAAwHLgJxeGG0WAIeBGF4YbRQCAt4DNto02kgAg4fS9Ng2aWnoOAOsDab+G5GtHZgIf+4ErgL5APifjgw2sBc52TcIVjkP8gY+RaPEhh1eBb5FF0CWOuVjHKYBHWYBvgFanjCzjbaThvgAl4AanjCxiHuVGVwrwGzIrWMUE2waBfmQHeAeyLzBVpbcDfwPvO+BkDQuRp70S2EZ1DygCB4GjnLEzjAISD/wZmEytAP71qCuCpnEl0kDf6YkSYITaAxJjHq1IY3dT3gSJEqCIRIjHFW5CGnd5RVqUAL4IvZY5GsMkxJn5gmrvM04AD9hql6Y53I006rxAepwA/nWWPZpmMAXZFg+b2+sJ4DEOHKX1SGPODLmXpAeUgIutMDWA6UiwY0vE/SQCeIijZH3PMA88gzTg1Ij7SXtACTk9OqYwG1nQvBKTJ6kAHhJOs+4o6eA1RIATYvKk6QElYJVBvrliDvLUnqyTL40AReAAMM0M5XyxFXFrZ9bJl7YHlIANZijnh/kI0SQnQbMIMAwcmzvrHDGAHIefWi8j2QQoAi/mzjonLEJI3pkwfxYBfBGiplZnKACDlIMdSZBVAA/ZR2woXIWQuz5FmawC+NeCnLhrww92fE262L6OAA3lKC1DSC1OWU63B5SAi/Tp66Ed+AX4nPRb7boCeEiv03KUdM8HLAe6kNNewTN/plFAfI6rLdsdRSfwB/BexvJ5vAIe0gOTzjw10OkBqxARnJ30Rvh3ISdLrGIGEux4U6OOPHqAvzAaIqOjlLUHrEG+5rw3Y/k80QIcgYxDVuAHO/o168mrB/iXNUdpszKmu321nXwFKCKf3xhFrzL0hEYdc5HGl5DV3D+qzjxE8JAPtI1hG7KF3ZWh7AzgWeRzmYPAfcg4MlOle+rSFUBnYI6FH+y4P2W5ycgAdQAh2A8cHZKvB/Hy/IboCDEvJcdEGEAWPp0J87cAlwLfK1LvIPHCeuhDltZZhfCAj8jZUbpQVX5HwvwLgE9VmZ2IEGlQUGV+oDzApRViUUqbsWQGgT3UX3LOBl5XBPYDt6LnrFS+Pml7wS5N26NYoipdGpOnE1gH/ItMkY8DR+ZhXGGaqn+EdL3hGl3DbcifmEQFO1qRbau9yuAWzB5v6UZ6WJH644NHuhBdKG5RlV0Wcq8P+FLd/wS7/wdwOvAByQbKFVmNdCB7coNU+ww9yOZHCfgR6QGuvju4AOmhUUL4jlKSMH0NVqtKzlW/wxYyzv8AgfJruI/oGWNd2kr9YMd2yiPxEOWFTJaVoGl0IA9lmFoRhoFj0lT2iCr4FNLN0yxkXGMWsInagfK5pBX4wQ6/4C7SL2QaAXORbxIrZ4WeJAU3qgL7kJD3WD/Hfz7wFdKmN+pl7kae/gbkhNd4wQRkIbcHOCMu42LiT3WMdbRT+0VaE00cyvgfEKvQLuWtHAIAAAAASUVORK5CYII=');

    this.drag_behavior = d3.drag().subject(function () {
      var t = d3.select(this.querySelector('image'));
      var snap_lines = get_coords_snap_lines(this.id);
      return {
        x: +t.attr('x'),
        y: +t.attr('y'),
        map_locked: !!map_div.select('#hand_button').classed('locked'),
        snap_lines: snap_lines
      };
    }).on('start', function () {
      d3.event.sourceEvent.stopPropagation();
      handle_click_hand('lock'); // zoom.on("zoom", null);
    }).on('end', function () {
      if (d3.event.subject && !d3.event.subject.map_locked) {
        handle_click_hand('unlock');
      } // zoom.on("zoom", zoom_without_redraw);
      pos_lgds_elem.set(this.id, this.getBoundingClientRect());
    }).on('drag', function () {
      d3.event.sourceEvent.preventDefault();
      var t1 = this.querySelector('image'),
          t2 = this.querySelector('rect'),
          tx = +d3.event.x,
          ty = +d3.event.y,
          dim = t2.width.baseVal.value / 2;
      if (tx < 0 - dim || tx > w + dim || ty < 0 - dim || ty > h + dim) {
        return;
      }
      t1.x.baseVal.value = tx;
      t1.y.baseVal.value = ty;
      t2.x.baseVal.value = tx - 7.5;
      t2.y.baseVal.value = ty - 7.5;
      self.x_center = tx - 7.5 + dim;
      self.y_center = ty - 7.5 + dim;
      if (_app.autoalign_features) {
        var _bbox = t2.getBoundingClientRect(),
            _xy0_map = get_map_xy0(),
            xmin = t2.x.baseVal.value,
            xmax = xmin + _bbox.width,
            ymin = t2.y.baseVal.value,
            ymax = ymin + _bbox.height,
            snap_lines_x = d3.event.subject.snap_lines.x,
            snap_lines_y = d3.event.subject.snap_lines.y;
        for (var i = 0; i < snap_lines_x.length; i++) {
          if (abs(snap_lines_x[i][0] - xmin) < 10) {
            var _y1 = min(min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
            var _y2 = max(max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
            make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y1, _y2);
            tx = snap_lines_x[i][0] + 7.5;
          }
          if (abs(snap_lines_x[i][0] - xmax) < 10) {
            var _y4 = min(min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
            var _y5 = max(max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
            make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y4, _y5);
            tx = snap_lines_x[i][0] - _bbox.width + 7.5;
          }
          if (abs(snap_lines_y[i][0] - ymin) < 10) {
            var _x1 = min(min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
            var _x2 = max(max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
            make_red_line_snap(_x1, _x2, snap_lines_y[i][0], snap_lines_y[i][0]);
            ty = snap_lines_y[i][0] + 7.5;
          }
          if (abs(snap_lines_y[i][0] - ymax) < 10) {
            var _x7 = min(min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
            var _x8 = max(max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
            make_red_line_snap(_x7, _x8, snap_lines_y[i][0], snap_lines_y[i][0]);
            ty = snap_lines_y[i][0] - _bbox.height + 7.5;
          }
        }
        t1.x.baseVal.value = tx;
        t1.y.baseVal.value = ty;
        t2.x.baseVal.value = tx - 7.5;
        t2.y.baseVal.value = ty - 7.5;
        self.x_center = tx - 7.5 + dim;
        self.y_center = ty - 7.5 + dim;
      }
    });

    var getItems = function getItems() {
      return [{ name: i18next.t('app_page.common.options'), action: function action() {
          _this5.editStyle();
        } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
          _this5.up_element();
        } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
          _this5.down_element();
        } }, { name: i18next.t('app_page.common.delete'), action: function action() {
          _this5.remove();
        } }];
    };

    var arrow_context_menu = new ContextMenu();

    var bbox = document.getElementById('north_arrow').getBoundingClientRect(),
        xy0_map = get_map_xy0();

    this.under_rect = arrow_gp.append('g').insert('rect').styles({ fill: 'green', 'fill-opacity': 0 }).attrs({ x: bbox.left - 7.5 - xy0_map.x, y: bbox.top - 7.5 - xy0_map.y, height: bbox.height + 15, width: bbox.width + 15 });

    this.x_center = bbox.left - xy0_map.x + bbox.width / 2;
    this.y_center = bbox.top - xy0_map.y + bbox.height / 2;

    arrow_gp.call(this.drag_behavior);

    arrow_gp.on('mouseover', function () {
      self.under_rect.style('fill-opacity', 0.1);
    }).on('mouseout', function () {
      self.under_rect.style('fill-opacity', 0);
    }).on('contextmenu dblclick', function () {
      d3.event.preventDefault();
      return arrow_context_menu.showMenu(d3.event, document.querySelector('body'), getItems());
    });
  },
  up_element: function up_element() {
    up_legend(this.svg_node.node());
  },
  down_element: function down_element() {
    down_legend(this.svg_node.node());
  },
  remove: function remove() {
    pos_lgds_elem.delete(this.svg_node.attr('id'));
    this.svg_node.remove();
    this.displayed = false;
  },
  editStyle: function editStyle() {
    var self = this,
        old_dim = +self.under_rect.attr('width'),
        old_rotate = !isNaN(+self.svg_node.attr('rotate')) ? +self.svg_node.attr('rotate') : 0,
        x_pos = +self.x_center - old_dim / 2,
        y_pos = +self.y_center - old_dim / 2;

    make_confirm_dialog2('arrowEditBox', i18next.t('app_page.north_arrow_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
      if (confirmed) {
        null;
      }
    });

    var box_body = d3.select('.arrowEditBox').select('.modal-body').style('width', '295px');
    box_body.append('h3').html(i18next.t('app_page.north_arrow_edit_box.title'));
    var a = box_body.append('p').attr('class', 'line_elem2');
    a.append('span').html(i18next.t('app_page.north_arrow_edit_box.size'));
    a.append('span').style('float', 'right').html(' px');
    a.append('input').attrs({ type: 'number',
      min: 0,
      max: 200,
      step: 1,
      value: old_dim,
      class: 'without_spinner',
      id: 'txt_size_n_arrow' }).styles({ float: 'right', width: '40px' }).on('change', function () {
      var elem = document.getElementById('range_size_n_arrow');
      elem.value = +this.value;
      elem.dispatchEvent(new Event('change'));
    });
    a.append('input').attrs({ type: 'range',
      min: 1,
      max: 200,
      step: 1,
      value: old_dim,
      id: 'range_size_n_arrow' }).styles({ 'vertical-align': 'middle', width: '140px', float: 'right' }).on('change', function () {
      var new_size = +this.value;
      self.arrow_img.attr('width', new_size);
      self.arrow_img.attr('height', new_size);
      var bbox = self.arrow_img.node().getBoundingClientRect(),
          xy0_map = get_map_xy0();
      self.under_rect.attrs({ x: bbox.left - 7.5 - xy0_map.x, y: bbox.top - 7.5 - xy0_map.y, height: bbox.height + 15, width: bbox.width + 15 });
      self.x_center = x_pos + new_size / 2;
      self.y_center = y_pos + new_size / 2;
      document.getElementById('txt_size_n_arrow').value = new_size;
    });

    var b = box_body.append('p').attr('class', 'line_elem2');
    b.append('span').html(i18next.t('app_page.north_arrow_edit_box.rotation'));
    b.append('span').style('float', 'right').html(' °');
    b.append('input').attrs({ type: 'number',
      min: 0,
      max: 360,
      step: 'any',
      value: old_rotate,
      class: 'without_spinner',
      id: 'txt_rotate_n_arrow' }).styles({ float: 'right', width: '40px' }).on('change', function () {
      var rotate_value = +this.value;
      self.svg_node.attr('rotate', rotate_value);
      self.svg_node.attr('transform', 'rotate(' + [rotate_value, self.x_center, self.y_center] + ')');
      document.getElementById('range_rotate_n_arrow').value = rotate_value;
    });
    b.append('input').attrs({ type: 'range', min: 0, max: 360, step: 0.1, id: 'range_rotate_n_arrow', value: old_rotate }).styles({ 'vertical-align': 'middle', width: '140px', float: 'right' }).on('change', function () {
      var rotate_value = +this.value;
      self.svg_node.attr('rotate', rotate_value);
      self.svg_node.attr('transform', 'rotate(' + [rotate_value, self.x_center, self.y_center] + ')');
      document.getElementById('txt_rotate_n_arrow').value = rotate_value;
    });
  },

  displayed: false
};

var UserRectangle = function () {
  function UserRectangle(id, origin_pt) {
    var parent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
    var untransformed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    _classCallCheck(this, UserRectangle);

    this.parent = parent || svg_map;
    this.svg_elem = d3.select(this.parent);
    this.id = id;
    this.stroke_width = 4;
    this.stroke_color = 'rgb(0, 0, 0)';
    this.fill_color = 'rgb(255, 255, 255)';
    this.fill_opacity = 0;
    this.height = 40;
    this.width = 30;
    var self = this;
    if (!untransformed) {
      var zoom_param = svg_map.__zoom;
      this.pt1 = [(origin_pt[0] - zoom_param.x) / zoom_param.k, (origin_pt[1] - zoom_param.y) / zoom_param.k];
    } else {
      this.pt1 = origin_pt;
    }

    this.drag_behavior = d3.drag().subject(function () {
      var t = d3.select(this.querySelector('rect'));
      return {
        x: +t.attr('x'),
        y: +t.attr('y'),
        map_locked: !!map_div.select('#hand_button').classed('locked')
      };
    }).on('start', function () {
      d3.event.sourceEvent.stopPropagation();
      handle_click_hand('lock');
    }).on('end', function () {
      if (d3.event.subject && !d3.event.subject.map_locked) {
        handle_click_hand('unlock');
      }
      // pos_lgds_elem.set(this.id, this.querySelector('rect').getBoundingClientRect());
    }).on('drag', function () {
      d3.event.sourceEvent.preventDefault();
      var _t = this.querySelector('rect'),
          subject = d3.event.subject,
          tx = (+d3.event.x - +subject.x) / svg_map.__zoom.k,
          ty = (+d3.event.y - +subject.y) / svg_map.__zoom.k;
      self.pt1 = [+subject.x + tx, +subject.y + ty];
      self.pt2 = [self.pt1[0] + self.width, self.pt1[1] + self.height];
      // if(_app.autoalign_features){
      //     let snap_lines_x = subject.snap_lines.x,
      //         snap_lines_y = subject.snap_lines.y;
      //     for(let i = 0; i < subject.snap_lines.x.length; i++){
      //         if(Math.abs(snap_lines_x[i] - (self.pt1[0] + svg_map.__zoom.x / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: snap_lines_x[i], x2: snap_lines_x[i], y1: 0, y2: h}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[0] = snap_lines_x[i] - svg_map.__zoom.x / svg_map.__zoom.k;
      //         }
      //         if(Math.abs(snap_lines_x[i] - (self.pt2[0] + svg_map.__zoom.x / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: snap_lines_x[i], x2: snap_lines_x[i], y1: 0, y2: h}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[0] = snap_lines_x[i] - svg_map.__zoom.x / svg_map.__zoom.k - self.width;
      //         }
      //         if(Math.abs(snap_lines_y[i] - (self.pt1[1] + svg_map.__zoom.y / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //               .attrs({x1: 0, x2: w, y1: snap_lines_y[i], y2: snap_lines_y[i]}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[1] = snap_lines_y[i] - svg_map.__zoom.y / svg_map.__zoom.k;
      //         }
      //         if(Math.abs(snap_lines_y[i] - (self.pt2[1] + svg_map.__zoom.y / svg_map.__zoom.k)) < 10){
      //           let l = map.append('line')
      //                 .attrs({x1: 0, x2: w, y1: snap_lines_y[i], y2: snap_lines_y[i]}).style('stroke', 'red');
      //           setTimeout(function(){ l.remove(); }, 1000);
      //           self.pt1[1] = snap_lines_y[i] - svg_map.__zoom.y / svg_map.__zoom.k - self.height;
      //         }
      //     }
      // }
      _t.x.baseVal.value = self.pt1[0];
      _t.y.baseVal.value = self.pt1[1];
    });
    this.draw();
    return this;
  }

  _createClass(UserRectangle, [{
    key: 'up_element',
    value: function up_element() {
      up_legend(this.rectangle.node());
    }
  }, {
    key: 'down_element',
    value: function down_element() {
      down_legend(this.rectangle.node());
    }
  }, {
    key: 'draw',
    value: function draw() {
      var _this6 = this;

      var context_menu = new ContextMenu();
      var getItems = function getItems() {
        return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
            _this6.editStyle();
          } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
            _this6.up_element();
          } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
            _this6.down_element();
          } }, { name: i18next.t('app_page.common.delete'), action: function action() {
            _this6.remove();
          } }];
      };

      this.rectangle = this.svg_elem.append('g').attrs({ class: 'user_rectangle legend scalable-legend',
        id: this.id,
        transform: svg_map.__zoom.toString() });

      var r = this.rectangle.insert('rect').attrs({
        x: this.pt1[0],
        y: this.pt1[1],
        height: this.height,
        width: this.width
      }).styles({
        'stroke-width': this.stroke_width,
        stroke: this.stroke_color,
        fill: this.fill_color,
        'fill-opacity': 0
      });

      this.rectangle.on('contextmenu', function () {
        context_menu.showMenu(d3.event, document.body, getItems());
      }).on('dblclick', function () {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        _this6.handle_ctrl_pt();
      }).call(this.drag_behavior);
      // pos_lgds_elem.set(this.rectangle.attr('id'), r.node().getBoundingClientRect());
    }
  }, {
    key: 'remove',
    value: function remove() {
      // pos_lgds_elem.delete(this.rectangle.attr('id'));
      this.rectangle.remove();
    }
  }, {
    key: 'handle_ctrl_pt',
    value: function handle_ctrl_pt() {
      var self = this,
          rectangle_elem = self.rectangle.node().querySelector('rect'),
          zoom_param = svg_map.__zoom,
          map_locked = !!map_div.select('#hand_button').classed('locked'),
          center_pt = [self.pt1[0] + rectangle_elem.width.baseVal.value / 2, self.pt1[1] + rectangle_elem.height.baseVal.value / 2],
          msg = alertify.notify(i18next.t('app_page.notification.instruction_modify_feature'), 'warning', 0);

      var cleanup_edit_state = function cleanup_edit_state() {
        edit_layer.remove();
        msg.dismiss();
        self.rectangle.call(self.drag_behavior);
        self.rectangle.on('dblclick', function () {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          self.handle_ctrl_pt();
        });
        if (!map_locked) {
          handle_click_hand('unlock');
        }
        document.getElementById('hand_button').onclick = handle_click_hand;
      };

      // Change the behavior of the 'lock' button :
      document.getElementById('hand_button').onclick = function () {
        cleanup_edit_state();
        handle_click_hand();
      };

      // Desactive the ability to drag the rectangle :
      self.rectangle.on('.drag', null);
      // Desactive the ability to zoom/move on the map ;
      handle_click_hand('lock');

      // Add a layer to intercept click on the map :
      var edit_layer = map.insert('g');
      edit_layer.append('rect').attrs({ x: 0, y: 0, width: w, height: h, class: 'edit_rect' }).style('fill', 'transparent').on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });

      var tmp_start_point = edit_layer.append('rect').attr('class', 'ctrl_pt').attr('id', 'pt1').attr('x', center_pt[0] * zoom_param.k + zoom_param.x - 4).attr('y', (center_pt[1] - rectangle_elem.height.baseVal.value / 2) * zoom_param.k + zoom_param.y - 4).attr('height', 8).attr('width', 8).call(d3.drag().on('drag', function () {
        var dist = center_pt[1] - (d3.event.y - zoom_param.y) / zoom_param.k;
        d3.select(this).attr('y', d3.event.y - 4);
        self.height = rectangle_elem.height.baseVal.value = dist * 2;
        self.pt1[1] = rectangle_elem.y.baseVal.value = center_pt[1] - dist;
      }));

      var tmp_end_point = edit_layer.append('rect').attrs({ class: 'ctrl_pt',
        height: 8,
        width: 8,
        id: 'pt2',
        x: (center_pt[0] - rectangle_elem.width.baseVal.value / 2) * zoom_param.k + zoom_param.x - 4,
        y: center_pt[1] * zoom_param.k + zoom_param.y - 4 }).call(d3.drag().on('drag', function () {
        var dist = center_pt[0] - (d3.event.x - zoom_param.x) / zoom_param.k;
        d3.select(this).attr('x', d3.event.x - 4);
        self.width = rectangle_elem.width.baseVal.value = dist * 2;
        self.pt1[0] = rectangle_elem.x.baseVal.value = center_pt[0] - dist;
      }));

      self.rectangle.on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });
    }
  }, {
    key: 'editStyle',
    value: function editStyle() {
      var self = this,
          rectangle_elem = self.rectangle.node().querySelector('rect'),
          zoom_param = svg_map.__zoom,
          map_locked = !!map_div.select('#hand_button').classed('locked'),
          current_options = { pt1: this.pt1.slice() };
      if (!map_locked) handle_click_hand('lock');
      make_confirm_dialog2('styleBoxRectangle', i18next.t('app_page.rectangle_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
        if (confirmed) {
          // Store shorcut of useful values :
          self.stroke_width = rectangle_elem.style.strokeWidth;
          self.stroke_color = rectangle_elem.style.stroke;
          self.fill_color = rectangle_elem.style.fill;
          self.fill_opacity = +rectangle_elem.style.fillOpacity;
        } else {
          // Rollback on initials parameters :
          self.pt1 = current_options.pt1.slice();
          rectangle_elem.style.strokeWidth = self.stroke_width;
          rectangle_elem.style.stroke = self.stroke_color;
          rectangle_elem.style.fill = self.fill_color;
          rectangle_elem.style.fillOpacity = self.fill_opacity;
        }
        if (!map_locked) handle_click_hand('unlock');
      });
      var box_content = d3.select('.styleBoxRectangle').select('.modal-body').style('width', '295px').insert('div').attr('id', 'styleBoxRectangle');
      var s1 = box_content.append('p').attr('class', 'line_elem2');
      s1.append('span').style('margin', 'auto').html(i18next.t('app_page.rectangle_edit_box.stroke_width'));
      var i1 = s1.append('input').attrs({ type: 'range', id: 'rectangle_stroke_width', min: 0, max: 34, step: 0.1 }).styles({ width: '55px', float: 'right' }).on('change', function () {
        rectangle_elem.style.strokeWidth = this.value;
        txt_line_weight.html(this.value + 'px');
      });
      i1.node().value = self.stroke_width;
      var txt_line_weight = s1.append('span').styles({ float: 'right', margin: '0 5px 0 5px' }).html(self.stroke_width + ' px');

      var s2 = box_content.append('p').attr('class', 'line_elem2');
      s2.append('span').style('margin', 'auto').html(i18next.t('app_page.rectangle_edit_box.stroke_color'));
      s2.append('input').style('float', 'right').attrs({ type: 'color', id: 'rectangle_strokeColor', value: rgb2hex(self.stroke_color) }).on('change', function () {
        rectangle_elem.style.stroke = this.value;
      });

      var s3 = box_content.append('p').attr('class', 'line_elem2');
      s3.append('span').style('margin', 'auto').html(i18next.t('app_page.rectangle_edit_box.fill_color'));
      s3.append('input').style('float', 'right').attrs({ type: 'color', id: 'rectangle_fillColor', value: rgb2hex(self.fill_color) }).on('change', function () {
        rectangle_elem.style.fill = this.value;
      });

      var s4 = box_content.append('p').attr('class', 'line_elem2');
      s4.append('span').style('margin', 'auto').html(i18next.t('app_page.rectangle_edit_box.fill_opacity'));
      var i2 = s4.append('input').attrs({ type: 'range', min: 0, max: 1, step: 0.1 }).styles({ width: '55px', float: 'right' }).on('change', function () {
        rectangle_elem.style.fillOpacity = this.value;
      });
      i2.node().value = rectangle_elem.style.fillOpacity;
    }
  }]);

  return UserRectangle;
}();

var UserEllipse = function () {
  function UserEllipse(id, origin_pt) {
    var parent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
    var untransformed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    _classCallCheck(this, UserEllipse);

    this.parent = parent || svg_map;
    this.svg_elem = d3.select(this.parent);
    this.id = id;
    this.stroke_width = 4;
    this.stroke_color = 'rgb(0, 0, 0)';

    if (!untransformed) {
      var zoom_param = svg_map.__zoom;
      this.pt1 = [(origin_pt[0] - zoom_param.x) / zoom_param.k, (origin_pt[1] - zoom_param.y) / zoom_param.k];
    } else {
      this.pt1 = origin_pt;
    }
    var self = this;
    this.drag_behavior = d3.drag().subject(function () {
      var t = d3.select(this.querySelector('ellipse'));
      return {
        x: +t.attr('cx'),
        y: +t.attr('cy'),
        map_locked: !!map_div.select('#hand_button').classed('locked')
      };
    }).on('start', function () {
      d3.event.sourceEvent.stopPropagation();
      handle_click_hand('lock');
    }).on('end', function () {
      if (d3.event.subject && !d3.event.subject.map_locked) {
        handle_click_hand('unlock'); // zoom.on("zoom", zoom_without_redraw);
      }
    }).on('drag', function () {
      d3.event.sourceEvent.preventDefault();
      var _t = this.querySelector('ellipse'),
          subject = d3.event.subject,
          tx = (+d3.event.x - +subject.x) / svg_map.__zoom.k,
          ty = (+d3.event.y - +subject.y) / svg_map.__zoom.k;
      self.pt1 = [+subject.x + tx, +subject.y + ty];
      _t.cx.baseVal.value = self.pt1[0];
      _t.cy.baseVal.value = self.pt1[1];
    });

    this.draw();
    return this;
  }

  _createClass(UserEllipse, [{
    key: 'draw',
    value: function draw() {
      var _this7 = this;

      var context_menu = new ContextMenu(),
          getItems = function getItems() {
        return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
            _this7.editStyle();
          } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
            _this7.up_element();
          } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
            _this7.down_element();
          } }, { name: i18next.t('app_page.common.delete'), action: function action() {
            _this7.remove();
          } }];
      };

      this.ellipse = this.svg_elem.append('g').attrs({ class: 'user_ellipse legend scalable-legend', id: this.id, transform: svg_map.__zoom.toString() });

      var e = this.ellipse.insert('ellipse').attrs({
        rx: 30,
        ry: 40,
        cx: this.pt1[0],
        cy: this.pt1[1]
      }).styles({
        'stroke-width': this.stroke_width,
        stroke: this.stroke_color,
        fill: 'rgb(255, 255, 255)',
        'fill-opacity': 0
      });

      this.ellipse.on('contextmenu', function () {
        context_menu.showMenu(d3.event, document.body, getItems());
      }).on('dblclick', function () {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        _this7.handle_ctrl_pt();
      }).call(this.drag_behavior);
    }
  }, {
    key: 'remove',
    value: function remove() {
      this.ellipse.remove();
    }
  }, {
    key: 'up_element',
    value: function up_element() {
      up_legend(this.ellipse.node());
    }
  }, {
    key: 'down_element',
    value: function down_element() {
      down_legend(this.ellipse.node());
    }
  }, {
    key: 'calcAngle',
    value: function calcAngle() {
      var ellipse_elem = this.ellipse.node().querySelector('ellipse'),
          dx = ellipse_elem.rx.baseVal.value - this.pt1[0],
          dy = ellipse_elem.ry.baseVal.value - this.pt1[1];
      return atan2(dy, dx) * (180 / PI);
    }
  }, {
    key: 'calcDestFromOAD',
    value: function calcDestFromOAD(origin, angle, distance) {
      var theta = angle / (180 / PI),
          dx = distance * cos(theta),
          dy = distance * sin(theta);
      return [origin[0] + dx, origin[1] + dy];
    }
  }, {
    key: 'editStyle',
    value: function editStyle() {
      var self = this,
          ellipse_elem = self.ellipse.node().querySelector('ellipse'),
          zoom_param = svg_map.__zoom,
          map_locked = !!map_div.select('#hand_button').classed('locked'),
          current_options = {
        pt1: this.pt1.slice(),
        rx: ellipse_elem.rx.baseVal.value,
        ry: ellipse_elem.ry.baseVal.value
      };
      var angle = (-this.calcAngle()).toFixed(0);

      if (!map_locked) handle_click_hand('lock');
      make_confirm_dialog2('styleBoxEllipse', i18next.t('app_page.ellipse_edit_box.title'), { widthFitContent: true }).then(function (confirmed) {
        map.selectAll('.ctrl_pt').remove();
        if (confirmed) {
          // Store shorcut of useful values :
          self.stroke_width = ellipse_elem.style.strokeWidth;
          self.stroke_color = ellipse_elem.style.stroke;
        } else {
          // Rollback on initials parameters :
          self.pt1 = current_options.pt1.slice();
          ellipse_elem.style.strokeWidth = self.stroke_width;
          ellipse_elem.style.stroke = self.stroke_color;
        }
        if (!map_locked) handle_click_hand('unlock');
      });
      var box_content = d3.select('.styleBoxEllipse').select('.modal-body').style('width', '295px').insert('div').attr('id', 'styleBoxEllipse');
      var s1 = box_content.append('p').attr('class', 'line_elem2');
      s1.append('span').style('margin', 'auto').html(i18next.t('app_page.ellipse_edit_box.stroke_width'));
      s1.append('input').attrs({ type: 'range', id: 'ellipse_stroke_width', min: 0, max: 34, step: 0.1, value: self.stroke_width }).styles({ width: '80px', float: 'right' }).on('change', function () {
        ellipse_elem.style.strokeWidth = this.value;
        txt_line_weight.html(this.value + 'px');
      });
      var txt_line_weight = s1.append('span').styles({ float: 'right', margin: '0 5px 0 5px' }).html(self.stroke_width + ' px');

      var s2 = box_content.append('p').attr('class', 'line_elem2');
      s2.append('span').style('margin', 'auto').html(i18next.t('app_page.ellipse_edit_box.stroke_color'));
      s2.append('input').style('float', 'right').attrs({ type: 'color', id: 'ellipse_strokeColor', value: self.stroke_color }).on('change', function () {
        ellipse_elem.style.stroke = this.value;
      });
      //  let s2b = box_content.append("p").attr('class', 'line_elem2')
      //  s2b.append("span").html(i18next.t("app_page.ellipse_edit_box.ellispeAngle"))
      //  s2b.insert("span").styles({float: 'right', 'width': '12px'}).html("&nbsp;°");
      //  s2b.insert("input")
      //      .attrs({id: "ellipse_angle_text", class: "without_spinner", value: angle, min: 0, max: 1, step: 1})
      //      .styles({width: "30px", "margin-left": "10px", 'float': 'right'})
      //      .on("input", function(){
      //          let elem = document.getElementById("ellipse_angle");
      //          elem.value = this.value;
      //          elem.dispatchEvent(new Event('change'));
      //      });
      //  s2b.insert("input")
      //      .attrs({id: "ellipse_angle", type: "range", value: Math.abs(angle), min: 0, max: 360, step: 1})
      //      .styles({width: "80px", "vertical-align": "middle", 'float': 'right'})
      //      .on("change", function(){
      //         let pt2 = [self.pt1[0] - ellipse_elem.rx.baseVal.value, self.pt1[1]],
      //             distance = Math.sqrt((self.pt1[0] - pt2[0]) * (self.pt1[0] - pt2[0]) + (self.pt1[1] - pt2[1]) * (self.pt1[1] - pt2[1])),
      //             angle = Math.abs(+this.value);
      //          let [nx, ny] = self.calcDestFromOAD(self.pt1, angle, distance);
      //          console.log("angle :", angle); console.log("pt2 :", pt2); console.log("distance :", distance);
      //          console.log(ellipse_elem.rx.baseVal.value, self.pt1[0], nx);
      //          console.log(ellipse_elem.ry.baseVal.value, self.pt1[1], ny);
      //          ellipse_elem.rx.baseVal.value = nx;
      //          ellipse_elem.ry.baseVal.value = ny;
      //          document.getElementById("ellipse_angle_text").value = +this.value;
      //      });
    }
  }, {
    key: 'handle_ctrl_pt',
    value: function handle_ctrl_pt() {
      var self = this,
          ellipse_elem = self.ellipse.node().querySelector('ellipse'),
          zoom_param = svg_map.__zoom,
          map_locked = !!map_div.select('#hand_button').classed('locked'),
          msg = alertify.notify(i18next.t('app_page.notification.instruction_modify_feature'), 'warning', 0);

      var cleanup_edit_state = function cleanup_edit_state() {
        edit_layer.remove();
        msg.dismiss();
        self.ellipse.call(self.drag_behavior);
        self.ellipse.on('dblclick', function () {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          self.handle_ctrl_pt();
        });
        if (!map_locked) {
          handle_click_hand('unlock');
        }
        document.getElementById('hand_button').onclick = handle_click_hand;
      };

      // Change the behavior of the 'lock' button :
      document.getElementById('hand_button').onclick = function () {
        cleanup_edit_state();
        handle_click_hand();
      };
      // Desactive the ability to drag the ellipse :
      self.ellipse.on('.drag', null);
      // Desactive the ability to zoom/move on the map ;
      handle_click_hand('lock');
      // Add a layer to intercept click on the map :
      var edit_layer = map.insert('g');
      edit_layer.append('rect').attrs({ x: 0, y: 0, width: w, height: h, class: 'edit_rect' }).style('fill', 'transparent').on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });

      var tmp_start_point = edit_layer.append('rect').attr('id', 'pt1').attr('class', 'ctrl_pt').attr('x', (self.pt1[0] - ellipse_elem.rx.baseVal.value) * zoom_param.k + zoom_param.x - 4).attr('y', self.pt1[1] * zoom_param.k + zoom_param.y - 4).attr('height', 8).attr('width', 8).call(d3.drag().on('drag', function () {
        var t = d3.select(this);
        t.attr('x', d3.event.x - 4);
        var dist = self.pt1[0] - (d3.event.x - zoom_param.x) / zoom_param.k;
        ellipse_elem.rx.baseVal.value = dist;
      }));
      var tmp_end_point = edit_layer.append('rect').attrs({ class: 'ctrl_pt',
        height: 8,
        width: 8,
        id: 'pt2',
        x: self.pt1[0] * zoom_param.k + zoom_param.x - 4,
        y: (self.pt1[1] - ellipse_elem.ry.baseVal.value) * zoom_param.k + zoom_param.y - 4 }).call(d3.drag().on('drag', function () {
        var t = d3.select(this);
        t.attr('y', d3.event.y - 4);
        var dist = self.pt1[1] - (d3.event.y - zoom_param.y) / zoom_param.k;
        ellipse_elem.ry.baseVal.value = dist;
      }));

      self.ellipse.on('dblclick', function () {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        cleanup_edit_state();
      });
    }
  }]);

  return UserEllipse;
}();

var get_coords_snap_lines = function get_coords_snap_lines(uid) {
  var snap_lines = { x: [], y: [] };

  var _get_map_xy2 = get_map_xy0(),
      x = _get_map_xy2.x,
      y = _get_map_xy2.y;

  pos_lgds_elem.forEach(function (v, k) {
    if (k != uid) {
      snap_lines.y.push([v.bottom - y, v.top - y]);
      snap_lines.y.push([v.top - y, v.bottom - y]);
      snap_lines.x.push([v.left - x, v.right - x]);
      snap_lines.x.push([v.right - x, v.left - x]);
    }
  });
  return snap_lines;
};
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
* Function called on clicking on the legend button of each layer
* - toggle the visibility of the legend (or create the legend if doesn't currently exists)
*
* @param {String} layer - The layer name
* @returns {void}
*/
function handle_legend(layer) {
  var state = current_layers[layer].renderer;
  if (state != undefined) {
    var class_name = ['.lgdf', _app.layer_to_id.get(layer)].join('_');
    var legends = svg_map.querySelectorAll(class_name);
    if (legends.length > 0) {
      if (legends[0].getAttribute('display') == null) {
        Array.prototype.forEach.call(legends, function (el) {
          return el.setAttribute('display', 'none');
        });
      } else {
        Array.prototype.forEach.call(legends, function (el) {
          return el.removeAttribute('display');
        });
        // Redisplay the legend(s) and also
        // verify if still in the visible part
        // of the map, if not, move them in:
        // .. so it's actually a feature if the legend is redrawn on its origin location
        // after being moved too close to the outer border of the map :
        var tol = 7.5;

        var _get_map_xy = get_map_xy0(),
            x0 = _get_map_xy.x,
            y0 = _get_map_xy.y;

        var limit_left = x0 - tol;
        var limit_right = x0 + +w + tol;
        var limit_top = y0 - tol;
        var limit_bottom = y0 + +h + tol;

        for (var i = 0; i < legends.length; i++) {
          var bboxLegend = legends[i].getBoundingClientRect();
          if (bboxLegend.left < limit_left || bboxLegend.left > limit_right || bboxLegend.top < limit_top || bboxLegend.top > limit_bottom) {
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
  var renderer = current_layers[layer].renderer,
      field = current_layers[layer].rendered_field,
      field2 = current_layers[layer].rendered_field2,
      type_layer = current_layers[layer].type;
  var el = void 0,
      el2 = void 0;

  var lgd_pos = getTranslateNewLegend();

  if (renderer.indexOf('Choropleth') > -1 || renderer.indexOf('Gridded') > -1 || renderer.indexOf('Stewart') > -1 || renderer.indexOf('TypoSymbols') > -1) {
    el = createLegend_choro(layer, field, title, field, 0);
  } else if (renderer.indexOf('Categorical') > -1) {
    el = createLegend_choro(layer, field, title, field, 4);
  } else if (renderer.indexOf('Links') !== -1 || renderer.indexOf('DiscLayer') !== -1) {
    el = createLegend_discont_links(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbolsChoro') !== -1) {
    el = createLegend_choro(layer, field2, title, field2, 0);
    el2 = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field) : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbolsTypo') !== -1) {
    el = createLegend_choro(layer, field2, title, field2, 4);
    el2 = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field) : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('PropSymbols') !== -1) {
    el = type_layer === 'Line' ? createLegend_line_symbol(layer, field, title, field) : createLegend_symbol(layer, field, title, field);
  } else if (renderer.indexOf('TwoStocksWaffle') !== -1) {
    el = createLegend_waffle(layer, field, title, '');
  } else {
    swal('Oops..', i18next.t('No legend available for this representation') + '.<br>' + i18next.t('Want to make a <a href="/">suggestion</a> ?'), 'warning');
    return;
  }

  if (el && lgd_pos && lgd_pos.x) {
    el.attr('transform', 'translate(' + lgd_pos.x + ',' + lgd_pos.y + ')');
  }
  pos_lgds_elem.set(el.attr('id') + ' ' + el.attr('class'), el.node().getBoundingClientRect());
  if (el2) {
    var prev_bbox = el.node().getBoundingClientRect(),
        dim_h = lgd_pos.y + prev_bbox.height,
        dim_w = lgd_pos.x + prev_bbox.width;
    var lgd_pos2 = getTranslateNewLegend();
    if (lgd_pos2.x !== lgd_pos.x || lgd_pos2.y !== lgd_pos.y) {
      el2.attr('transform', 'translate(' + lgd_pos2.x + ',' + lgd_pos2.y + ')');
    } else if (dim_h < h) {
      el2.attr('transform', 'translate(' + lgd_pos.x + ',' + dim_h + ')');
    } else if (dim_w < w) {
      el2.attr('transform', 'translate(' + dim_w + ',' + lgd_pos.y + ')');
    }
    pos_lgds_elem.set(el2.attr('id') + ' ' + el2.attr('class'), el2.node().getBoundingClientRect());
  }
}

function up_legend(legend_node) {
  var lgd_features = svg_map.querySelectorAll('.legend'),
      nb_lgd_features = +lgd_features.length;
  var self_position = void 0;

  for (var i = 0; i < nb_lgd_features; i++) {
    if (lgd_features[i].id === legend_node.id && lgd_features[i].classList === legend_node.classList) {
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
  var lgd_features = svg_map.querySelectorAll('.legend'),
      nb_lgd_features = +lgd_features.length;
  var self_position = void 0;

  for (var i = 0; i < nb_lgd_features; i++) {
    if (lgd_features[i].id === legend_node.id && lgd_features[i].classList === legend_node.classList) {
      self_position = i;
    }
  }
  if (self_position !== 0) {
    svg_map.insertBefore(lgd_features[self_position], lgd_features[self_position - 1]);
  }
}

function make_legend_context_menu(legend_node, layer) {
  var context_menu = new ContextMenu();
  var getItems = function getItems() {
    return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
        createlegendEditBox(legend_node.attr('id'), legend_node.attr('layer_name'));
      } }, { name: i18next.t('app_page.common.up_element'), action: function action() {
        up_legend(legend_node.node());
      } }, { name: i18next.t('app_page.common.down_element'), action: function action() {
        down_legend(legend_node.node());
      } }, { name: i18next.t('app_page.common.hide'),
      action: function action() {
        if (!(legend_node.attr('display') === 'none')) legend_node.attr('display', 'none');else legend_node.attr('display', null);
      } }];
  };
  legend_node.on('dblclick', function () {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    createlegendEditBox(legend_node.attr('id'), legend_node.attr('layer_name'));
  });

  legend_node.on('contextmenu', function () {
    context_menu.showMenu(d3.event, document.querySelector('body'), getItems());
  });
}

var make_red_line_snap = function make_red_line_snap(x1, x2, y1, y2) {
  var timeout = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 750;

  var current_timeout = void 0;
  return function () {
    if (current_timeout) {
      clearTimeout(current_timeout);
    }
    map.select('.snap_line').remove();
    var line = map.append('line').attrs({ x1: x1, x2: x2, y1: y1, y2: y2, class: 'snap_line' }).styles({ stroke: 'red', 'stroke-width': 0.7 });
    current_timeout = setTimeout(function (_) {
      line.remove();
    }, timeout);
  }();
};

var drag_legend_func = function drag_legend_func(legend_group) {
  return d3.drag().subject(function () {
    var t = d3.select(this),
        prev_translate = t.attr('transform'),
        snap_lines = get_coords_snap_lines(t.attr('id') + ' ' + t.attr('class'));
    prev_translate = prev_translate ? prev_translate.slice(10, -1).split(',').map(function (f) {
      return +f;
    }) : [0, 0];
    return {
      x: t.attr('x') + prev_translate[0],
      y: t.attr('y') + prev_translate[1],
      map_locked: !!map_div.select('#hand_button').classed('locked'),
      map_offset: get_map_xy0(),
      snap_lines: snap_lines,
      offset: [legend_group.select('#under_rect').attr('x'), legend_group.select('#under_rect').attr('y')]
    };
  }).on('start', function () {
    d3.event.sourceEvent.stopPropagation();
    d3.event.sourceEvent.preventDefault();
    handle_click_hand('lock');
  }).on('end', function () {
    if (d3.event.subject && !d3.event.subject.map_locked) {
      handle_click_hand('unlock');
    }
    legend_group.style('cursor', 'grab');
    pos_lgds_elem.set(legend_group.attr('id') + ' ' + legend_group.attr('class'), legend_group.node().getBoundingClientRect());
  }).on('drag', function () {
    var Min = Math.min;
    var Max = Math.max;
    var new_value = [d3.event.x, d3.event.y];
    var prev_value = legend_group.attr('transform');
    prev_value = prev_value ? prev_value.slice(10, -1).split(',').map(function (f) {
      return +f;
    }) : [0, 0];

    legend_group.attr('transform', 'translate(' + new_value + ')').style('cursor', 'grabbing');

    var bbox_elem = legend_group.node().getBoundingClientRect(),
        map_offset = d3.event.subject.map_offset;
    var val_x = d3.event.x,
        val_y = d3.event.y,
        change = void 0;

    if (_app.autoalign_features) {
      var xy0 = get_map_xy0(),
          xmin = bbox_elem.left - xy0.x,
          xmax = bbox_elem.right - xy0.x,
          ymin = bbox_elem.top - xy0.y,
          ymax = bbox_elem.bottom - xy0.y;

      var snap_lines_x = d3.event.subject.snap_lines.x,
          snap_lines_y = d3.event.subject.snap_lines.y;
      for (var i = 0; i < snap_lines_x.length; i++) {
        if (Math.abs(snap_lines_x[i][0] - xmin) < 10) {
          var _y1 = Min(Min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
          var _y2 = Max(Max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
          make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y1, _y2);
          val_x = snap_lines_x[i][0] - d3.event.subject.offset[0];
          change = true;
        }
        if (Math.abs(snap_lines_x[i][0] - xmax) < 10) {
          var _y = Min(Min(snap_lines_y[i][0], snap_lines_y[i][1]), ymin);
          var _y3 = Max(Max(snap_lines_y[i][0], snap_lines_y[i][1]), ymax);
          make_red_line_snap(snap_lines_x[i][0], snap_lines_x[i][0], _y, _y3);
          val_x = snap_lines_x[i][0] - bbox_elem.width - d3.event.subject.offset[0];
          change = true;
        }
        if (Math.abs(snap_lines_y[i][0] - ymin) < 10) {
          var x1 = Min(Min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
          var x2 = Max(Max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
          make_red_line_snap(x1, x2, snap_lines_y[i][0], snap_lines_y[i][0]);
          val_y = snap_lines_y[i][0] - d3.event.subject.offset[1];
          change = true;
        }
        if (Math.abs(snap_lines_y[i][0] - ymax) < 10) {
          var _x2 = Min(Min(snap_lines_x[i][0], snap_lines_x[i][1]), xmin);
          var _x3 = Max(Max(snap_lines_x[i][0], snap_lines_x[i][1]), xmax);
          make_red_line_snap(_x2, _x3, snap_lines_y[i][0], snap_lines_y[i][0]);
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
      legend_group.attr('transform', 'translate(' + [val_x, val_y] + ')');
    }
  });
};

function createLegend_waffle(layer, fields, title, subtitle, rect_fill_value, ratio_txt, note_bottom) {
  var space_elem = 18;
  var boxheight = 18;
  var boxwidth = 18;
  var boxgap = 12;
  var xpos = 30;
  var ypos = 30;
  var y_pos2 = ypos + space_elem;
  var tmp_class_name = ['legend', 'legend_feature', 'lgdf_' + _app.layer_to_id.get(layer)].join(' ');
  var nbVar = fields.length;
  var ref_colors = current_layers[layer].fill_color;
  var symbol = current_layers[layer].symbol;
  var size_symbol = current_layers[layer].size;
  var last_size = void 0;
  var last_pos = void 0;

  var legend_root = map.insert('g').attrs({
    id: 'legend_root_waffle',
    class: tmp_class_name,
    transform: 'translate(0,0)',
    layer_name: layer
  }).styles({
    cursor: 'grab',
    font: '11px "Enriqueta", arial, serif'
  });

  var rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attrs(subtitle != '' ? { id: 'legendtitle', x: xpos + space_elem, y: ypos } : { id: 'legendtitle', x: xpos + space_elem, y: ypos + 15 }).style('font', 'bold 12px "Enriqueta", arial, serif').text(title || '');

  legend_root.insert('text').attrs({ id: 'legendsubtitle', x: xpos + space_elem, y: ypos + 15 }).style('font', 'italic 12px "Enriqueta", arial, serif').text(subtitle);

  var fields_colors = [];
  for (var i = 0; i < nbVar; i++) {
    fields_colors.push([fields[i], ref_colors[i]]);
  }

  var legend_elems = legend_root.selectAll('.legend').append('g').data(fields_colors).enter().insert('g').attr('class', function (d, i) {
    return 'lg legend_' + i;
  });

  legend_elems.append('rect').attr('x', xpos + boxwidth).attr('y', function (d, i) {
    last_pos = y_pos2 + i * boxgap + i * boxheight;
    return last_pos;
  }).attrs({ width: boxwidth, height: boxheight }).styles(function (d) {
    return { fill: d[1], stroke: d[1] };
  });

  legend_elems.append('text').attr('x', xpos + boxwidth * 2 + 10).attr('y', function (d, i) {
    return y_pos2 + i * boxheight + i * boxgap + boxheight * 2 / 3;
  }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
    return d[0];
  });

  var legend_symbol_size = legend_root.append('g');
  if (symbol === 'rect') {
    legend_symbol_size.insert('rect').attrs({ x: xpos + boxwidth, y: last_pos + 2 * space_elem, width: size_symbol, height: size_symbol }).styles({ fill: 'lightgray', stroke: 'black', 'stroke-width': '0.8px' });
    legend_symbol_size.insert('text').attrs({ x: xpos + boxwidth + space_elem + size_symbol, y: last_pos + 2 * space_elem + size_symbol / 2 + 5, id: 'ratio_txt' }).text(ratio_txt || ' = ' + current_layers[layer].ratio);
    last_pos = last_pos + 3 * space_elem + size_symbol;
  } else {
    legend_symbol_size.insert('circle').attrs({ cx: xpos + boxwidth + size_symbol, cy: last_pos + 2 * space_elem + size_symbol, r: size_symbol }).styles({ fill: 'lightgray', stroke: 'black', 'stroke-width': '0.8px' });
    legend_symbol_size.insert('text').attrs({ x: xpos + boxwidth + space_elem + size_symbol * 2, y: last_pos + 2 * space_elem + size_symbol + 5, id: 'ratio_txt' }).text(ratio_txt || ' = ' + current_layers[layer].ratio);
    last_pos = last_pos + 3 * space_elem + size_symbol * 2;
  }

  legend_root.append('g').insert('text').attrs({ id: 'legend_bottom_note', x: xpos + space_elem, y: last_pos }).style('font', '11px "Enriqueta", arial, serif').text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));

  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function createLegend_discont_links(layer, field, title, subtitle, rect_fill_value, rounding_precision, note_bottom) {
  var space_elem = 18,
      boxgap = 12,
      xpos = 30,
      ypos = 30,
      y_pos2 = ypos + space_elem,
      tmp_class_name = ['legend', 'legend_feature', 'lgdf_' + _app.layer_to_id.get(layer)].join(' '),
      breaks = current_layers[layer].breaks,
      nb_class = breaks.length;

  if (rounding_precision === undefined) {
    var b_val = breaks.map(function (v, i) {
      return v[0][0];
    }).concat(breaks[nb_class - 1][0][1]);
    rounding_precision = get_lgd_display_precision(b_val);
  }

  var legend_root = map.insert('g').attrs({ id: 'legend_root_lines_class', class: tmp_class_name, transform: 'translate(0,0)', rounding_precision: rounding_precision, layer_field: field, layer_name: layer }).styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' });

  var rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle').text(title || '').style('font', 'bold 12px "Enriqueta", arial, serif').attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle').text(subtitle).style('font', 'italic 12px "Enriqueta", arial, serif').attrs({ x: xpos + space_elem, y: ypos + 15 });

  var ref_symbols_params = [];

  // Prepare symbols for the legend, taking care of not representing values
  // under the display threshold defined by the user (if any) :
  var current_min_value = +current_layers[layer].min_display;
  if (current_layers[layer].renderer === 'DiscLayer') {
    // Todo use the same way to store the threshold for links and disclayer
    // in order to avoid theses condition
    var values = Array.prototype.map.call(svg_map.querySelector('#' + _app.layer_to_id.get(layer)).querySelectorAll('path'), function (d) {
      return +d.__data__.properties.disc_value;
    });
    current_min_value = current_min_value !== 1 ? values[Math.round(current_min_value * current_layers[layer].n_features)] : values[values.length - 1];
  }
  // for (const b_val of breaks) {
  for (var ix = 0; ix < nb_class; ix++) {
    var _b_val = breaks[ix];
    if (_b_val[1] !== 0) {
      if (current_min_value >= +_b_val[0][0] && current_min_value < +_b_val[0][1]) {
        ref_symbols_params.push({ value: [current_min_value, _b_val[0][1]], size: _b_val[1] });
      } else if (current_min_value < +_b_val[0][0] && current_min_value < +_b_val[0][1]) {
        ref_symbols_params.push({ value: _b_val[0], size: _b_val[1] });
      }
    }
  }

  ref_symbols_params.reverse();

  var legend_elems = legend_root.selectAll('.legend').append('g').data(ref_symbols_params).enter().insert('g').attr('class', function (d, i) {
    return 'lg legend_' + i;
  });

  var max_size = current_layers[layer].size[1],
      color = current_layers[layer].fill_color.single,
      xrect = xpos + space_elem + max_size / 2;
  var last_size = 0,
      last_pos = y_pos2;

  legend_elems.append('rect').styles({ fill: color, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1, 'stroke-width': 0 }).attrs(function (d) {
    last_pos = boxgap + last_pos + last_size;
    last_size = d.size * svg_map.__zoom.k;
    return { x: xrect, y: last_pos, width: 45, height: last_size };
  });

  last_pos = y_pos2;
  last_size = 0;

  var x_text_pos = xpos + space_elem + max_size * 1.5 + 45;
  var tmp_pos = void 0;
  legend_elems.append('text').attrs(function (d) {
    last_pos = boxgap + last_pos + last_size;
    last_size = d.size * svg_map.__zoom.k;
    tmp_pos = last_pos - last_size / 4;
    return { x: x_text_pos, y: tmp_pos };
  }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
    return round_value(d.value[1], rounding_precision).toLocaleString();
  });

  legend_root.insert('text').attr('id', 'lgd_choro_min_val').attr('x', x_text_pos).attr('y', tmp_pos + boxgap).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(round_value(ref_symbols_params[ref_symbols_params.length - 1].value[0], rounding_precision).toLocaleString());

  legend_root.call(drag_legend_func(legend_root));

  legend_root.append('g').insert('text').attr('id', 'legend_bottom_note').attrs({ x: xpos + space_elem, y: last_pos + 2 * space_elem }).style('font', '11px "Enriqueta", arial, serif').text(note_bottom != null ? note_bottom : '');
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
  var bboxLegend = legend_root.node().getBoundingClientRect();
  var translate = legend_root.attr('transform');

  var _get_map_xy2 = get_map_xy0(),
      x0 = _get_map_xy2.x,
      y0 = _get_map_xy2.y;

  translate = translate ? translate.split('translate(')[1].split(')')[0].split(',').map(function (d) {
    return +d;
  }) : [0, 0];

  var x_top_left = bboxLegend.left - x0 - 12.5 - translate[0];
  var y_top_left = bboxLegend.top - y0 - 12.5 - translate[1];
  var x_top_right = bboxLegend.right - x0 + 12.5 - translate[0];
  var y_bottom_left = bboxLegend.bottom - y0 + 12.5 - translate[1];
  var rect_height = y_bottom_left - y_top_left;
  var rect_width = x_top_right - x_top_left;

  under_rect.attrs({
    id: 'under_rect',
    x: x_top_left,
    y: y_top_left,
    height: rect_height,
    width: rect_width });

  if (!fill || !fill.color || !fill.opacity) {
    under_rect.styles({ fill: 'green', 'fill-opacity': 0 });
    legend_root.attr('visible_rect', 'false');
    legend_root.on('mouseover', function () {
      under_rect.style('fill-opacity', 0.1);
    }).on('mouseout', function () {
      under_rect.style('fill-opacity', 0);
    });
  } else {
    under_rect.styles({ fill: fill.color, 'fill-opacity': fill.opacity });
    legend_root.attr('visible_rect', 'true');
    legend_root.on('mouseover', null).on('mouseout', null);
  }
}

function createLegend_symbol(layer, field, title, subtitle) {
  var nested = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'false';
  var rect_fill_value = arguments[5];
  var rounding_precision = arguments[6];
  var note_bottom = arguments[7];
  var options = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {};

  var parent = options.parent || window.map;
  var space_elem = 18;
  var boxgap = 4;
  var xpos = 30;
  var ypos = 30;
  var y_pos2 = ypos + space_elem * 1.5;
  var nb_features = current_layers[layer].n_features;
  var tmp_class_name = ['legend', 'legend_feature', 'lgdf_' + _app.layer_to_id.get(layer)].join(' ');
  var symbol_type = current_layers[layer].symbol;

  var color_symb_lgd = current_layers[layer].renderer === 'PropSymbolsChoro' || current_layers[layer].renderer === 'PropSymbolsTypo' || current_layers[layer].fill_color.two !== undefined || current_layers[layer].fill_color.random !== undefined ? '#FFF' : current_layers[layer].fill_color.single;

  var legend_root = parent.insert('g').styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' }).attrs({ id: 'legend_root_symbol',
    class: tmp_class_name,
    transform: 'translate(0,0)',
    layer_name: layer,
    nested: nested,
    rounding_precision: rounding_precision,
    layer_field: field });

  var rect_under_legend = legend_root.insert('rect');
  legend_root.insert('text').attr('id', 'legendtitle').text(title).style('font', 'bold 12px "Enriqueta", arial, serif').attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });
  legend_root.insert('text').attr('id', 'legendsubtitle').text(subtitle).style('font', 'italic 12px "Enriqueta", arial, serif').attrs({ x: xpos + space_elem, y: ypos + 15 });

  var ref_symbols = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName(symbol_type);
  var type_param = symbol_type === 'circle' ? 'r' : 'width';
  var z_scale = +d3.zoomTransform(map.node()).k;

  var _current_layers$layer = _slicedToArray(current_layers[layer].size, 2),
      ref_value = _current_layers$layer[0],
      ref_size = _current_layers$layer[1];

  var propSize = new PropSizer(ref_value, ref_size, symbol_type);

  if (!current_layers[layer].size_legend_symbol) {
    var non_empty = Array.prototype.filter.call(ref_symbols, function (d, i) {
      if (d[type_param].baseVal.value != 0) return d[type_param].baseVal.value;
    }),
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
    current_layers[layer].size_legend_symbol = [{ value: val_max }, { value: round_value(propSize.get_value(size_interm2), r) }, { value: round_value(propSize.get_value(size_interm1), r) }, { value: val_min }];
  }

  var t = current_layers[layer].size_legend_symbol;
  var ref_symbols_params = [{ size: propSize.scale(t[0].value) * z_scale, value: t[0].value }, { size: propSize.scale(t[1].value) * z_scale, value: t[1].value }, { size: propSize.scale(t[2].value) * z_scale, value: t[2].value }, { size: propSize.scale(t[3].value) * z_scale, value: t[3].value }];
  if (ref_symbols_params[3].value === 0) {
    ref_symbols_params.pop();
  }
  if (ref_symbols_params[2].value === 0) {
    ref_symbols_params.pop();
  }
  var legend_elems = legend_root.selectAll('.legend').append('g').data(ref_symbols_params).enter().insert('g').attr('class', function (d, i) {
    return 'lg legend_' + i;
  });

  var max_size = ref_symbols_params[0].size;
  var last_size = 0;

  if (symbol_type === 'rect') {
    y_pos2 -= max_size / 2;
  }

  var last_pos = y_pos2;

  if (nested === 'false') {
    if (symbol_type === 'circle') {
      legend_elems.append('circle').styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 }).attrs(function (d, i) {
        last_pos = i * boxgap + d.size + last_pos + last_size;
        last_size = d.size;
        return {
          cx: xpos + space_elem + boxgap + max_size / 2,
          cy: last_pos,
          r: d.size
        };
      });

      last_pos = y_pos2;last_size = 0;
      legend_elems.append('text').attrs(function (d, i) {
        last_pos = i * boxgap + d.size + last_pos + last_size;
        last_size = d.size;
        return {
          x: xpos + space_elem + boxgap + max_size * 1.5 + 5,
          y: last_pos + i * 2 / 3
        };
      }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
        return round_value(d.value, rounding_precision).toLocaleString();
      });
    } else if (symbol_type === 'rect') {
      legend_elems.append('rect').styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 }).attrs(function (d, i) {
        last_pos = i * boxgap + d.size / 2 + last_pos + last_size;
        last_size = d.size;
        return {
          x: xpos + space_elem + boxgap + max_size / 2 - last_size / 2,
          y: last_pos,
          width: last_size,
          height: last_size
        };
      });

      last_pos = y_pos2;last_size = 0;
      var x_text_pos = xpos + space_elem + max_size * 1.25;
      legend_elems.append('text').attr('x', x_text_pos).attr('y', function (d, i) {
        last_pos = i * boxgap + d.size / 2 + last_pos + last_size;
        last_size = d.size;
        return last_pos + d.size * 0.6;
      }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
        return round_value(d.value, rounding_precision).toLocaleString();
      });
    }
  } else if (nested === 'true') {
    if (symbol_type === 'circle') {
      legend_elems.append('circle').attrs(function (d) {
        return {
          cx: xpos + space_elem + boxgap + max_size / 2,
          cy: ypos + 45 + max_size + max_size / 2 - d.size,
          r: d.size
        };
      }).styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 });
      last_pos = y_pos2;last_size = 0;
      legend_elems.append('text').attr('x', xpos + space_elem + boxgap + max_size * 1.5 + 5).attr('y', function (d) {
        return ypos + 45 + max_size * 2 - max_size / 2 - d.size * 2;
      }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
        return round_value(d.value, rounding_precision).toLocaleString();
      });
      last_pos = ypos + 30 + max_size + max_size / 2;
    } else if (symbol_type === 'rect') {
      legend_elems.append('rect').attrs(function (d) {
        return {
          x: xpos + space_elem + boxgap,
          y: ypos + 45 + max_size - d.size,
          width: d.size,
          height: d.size };
      }).styles({ fill: color_symb_lgd, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1 });
      last_pos = y_pos2;last_size = 0;
      legend_elems.append('text').attr('x', xpos + space_elem + max_size * 1.25).attr('y', function (d) {
        return ypos + 46 + max_size - d.size;
      }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
        return round_value(d.value, rounding_precision).toLocaleString();
      });
      last_pos = ypos + 30 + max_size;
    }
  }

  if (current_layers[layer].break_val !== undefined) {
    var bottom_colors = legend_root.append('g');
    bottom_colors.insert('text').attr('id', 'col1_txt').attr('x', xpos + space_elem).attr('y', last_pos + 1.75 * space_elem).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).html('< ' + current_layers[layer].break_val.toLocaleString());
    bottom_colors.insert('rect').attr('id', 'col1').attr('x', xpos + space_elem).attr('y', last_pos + 2 * space_elem).attrs({ width: space_elem, height: space_elem }).style('fill', current_layers[layer].fill_color.two[0]);
    bottom_colors.insert('text').attr('id', 'col1_txt').attr('x', xpos + 3 * space_elem).attr('y', last_pos + 1.75 * space_elem).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).html('> ' + current_layers[layer].break_val.toLocaleString());
    bottom_colors.insert('rect').attr('id', 'col2').attr('x', xpos + 3 * space_elem).attr('y', last_pos + 2 * space_elem).attrs({ width: space_elem, height: space_elem }).style('fill', current_layers[layer].fill_color.two[1]);
    last_pos += 2.5 * space_elem;
  }

  legend_root.append('g').insert('text').attr('id', 'legend_bottom_note').attrs({ x: xpos + space_elem, y: last_pos + 2 * space_elem }).style('font', '11px "Enriqueta", arial, serif').text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  if (parent == map) make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function createLegend_line_symbol(layer, field, title, subtitle, rect_fill_value, rounding_precision, note_bottom) {
  var space_elem = 18,
      boxgap = 12,
      xpos = 30,
      ypos = 30,
      y_pos2 = ypos + space_elem,
      tmp_class_name = ['legend', 'legend_feature', 'lgdf_' + _app.layer_to_id.get(layer)].join(' ');

  var ref_symbols = document.getElementById(_app.layer_to_id.get(layer)).getElementsByTagName('path');
  var type_param = 'strokeWidth';

  var non_empty = Array.prototype.filter.call(ref_symbols, function (d) {
    return d.style[type_param] !== '0';
  }),
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
      ref_symbols_params = [{ size: size_max, value: val_max }, { size: size_interm2, value: val_interm2 }, { size: size_interm1, value: val_interm1 }, { size: size_min, value: val_min }];

  if (rounding_precision === undefined) {
    rounding_precision = get_lgd_display_precision(ref_symbols_params.map(function (d) {
      return d.value;
    }));
  }

  var legend_root = map.insert('g').attrs({ id: 'legend_root_lines_symbol',
    class: tmp_class_name,
    transform: 'translate(0,0)',
    rounding_precision: rounding_precision,
    layer_field: field,
    layer_name: layer }).styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' });

  var rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle').text(title || 'Title').style('font', 'bold 12px "Enriqueta", arial, serif').attrs(subtitle != '' ? { x: xpos + space_elem, y: ypos } : { x: xpos + space_elem, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle').text(subtitle).style('font', 'italic 12px \'Enriqueta\', arial, serif').attrs({ x: xpos + space_elem, y: ypos + 15 });

  var legend_elems = legend_root.selectAll('.legend').append('g').data(ref_symbols_params).enter().insert('g').attr('class', function (d, i) {
    return 'lg legend_' + i;
  });

  var last_size = 0;
  var last_pos = y_pos2;
  var color = current_layers[layer].fill_color.single;
  var xrect = xpos + space_elem;

  legend_elems.append('rect').styles({ fill: color, stroke: 'rgb(0, 0, 0)', 'fill-opacity': 1, 'stroke-width': 0 }).attrs(function (d) {
    last_pos = boxgap + last_pos + last_size;
    last_size = d.size;
    return { x: xrect, y: last_pos, width: 45, height: d.size };
  });

  last_pos = y_pos2;last_size = 0;
  var x_text_pos = xrect + 55;
  legend_elems.append('text').attrs(function (d) {
    last_pos = boxgap + last_pos + d.size;
    return { x: x_text_pos, y: last_pos + 4 - d.size / 2 };
  }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
    return round_value(d.value, rounding_precision).toLocaleString();
  });

  legend_root.append('g').insert('text').attr('id', 'legend_bottom_note').attrs({ x: xpos + space_elem, y: last_pos + space_elem }).style('font', "11px 'Enriqueta', arial, serif").text(note_bottom != null ? note_bottom : '');

  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  legend_root.select('#legendtitle').text(title || '');
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

var get_lgd_display_precision = function get_lgd_display_precision(breaks) {
  // Set rounding precision to 0 if they are all integers :
  if (breaks.filter(function (b) {
    return (b | 0) === b;
  }).length === breaks.length) {
    return 0;
  }
  // Compute the difference between each break to set
  // ... the rounding precision in order to differenciate each class :
  var diff = void 0;
  for (var i = 0; i < breaks.length - 1; i++) {
    var d = +breaks[i + 1] - +breaks[i];
    if (!diff) diff = d;else if (d < diff) diff = d;
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

function createLegend_choro(layer, field, title, subtitle) {
  var box_gap = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var rect_fill_value = arguments[5];
  var rounding_precision = arguments[6];
  var no_data_txt = arguments[7];
  var note_bottom = arguments[8];

  var boxheight = 18,
      boxwidth = 18,
      xpos = 30,
      ypos = 30,
      y_pos2 = ypos + boxheight * 1.8,
      tmp_class_name = ['legend', 'legend_feature', 'lgdf_' + _app.layer_to_id.get(layer)].join(' ');

  var boxgap = +box_gap;

  var last_pos = null,
      nb_class = void 0,
      data_colors_label = void 0;

  if (current_layers[layer].renderer.indexOf('Categorical') > -1 || current_layers[layer].renderer.indexOf('PropSymbolsTypo') > -1) {
    data_colors_label = [];
    current_layers[layer].color_map.forEach(function (v, k) {
      data_colors_label.push({ value: v[1], color: v[0] });
    });
    nb_class = current_layers[layer].color_map.size;
  } else if (current_layers[layer].renderer.indexOf('TypoSymbols') > -1) {
    data_colors_label = [];
    current_layers[layer].symbols_map.forEach(function (v, k) {
      data_colors_label.push({ value: k, image: v });
    });
    nb_class = current_layers[layer].symbols_map.size;
  } else {
    data_colors_label = current_layers[layer].colors_breaks.map(function (obj) {
      return { value: obj[0], color: obj[1] };
    });
    nb_class = current_layers[layer].colors_breaks.length;
    if (rounding_precision === undefined) {
      var breaks = current_layers[layer].options_disc.breaks;
      rounding_precision = get_lgd_display_precision(breaks);
    }
  }

  var legend_root = map.insert('g').styles({ cursor: 'grab', font: '11px "Enriqueta",arial,serif' }).attrs({ id: 'legend_root',
    class: tmp_class_name,
    layer_field: field,
    transform: 'translate(0,0)',
    boxgap: boxgap,
    rounding_precision: rounding_precision,
    layer_name: layer });

  var rect_under_legend = legend_root.insert('rect');

  legend_root.insert('text').attr('id', 'legendtitle').text(title || '').style('font', 'bold 12px "Enriqueta", arial, serif').attrs(subtitle != '' ? { x: xpos + boxheight, y: ypos } : { x: xpos + boxheight, y: ypos + 15 });

  legend_root.insert('text').attr('id', 'legendsubtitle').text(subtitle).style('font', 'italic 12px "Enriqueta", arial, serif').attrs({ x: xpos + boxheight, y: ypos + 15 });

  var legend_elems = legend_root.selectAll('.legend').append('g').data(data_colors_label).enter().insert('g').attr('class', function (d, i) {
    return 'lg legend_' + i;
  });

  if (current_layers[layer].renderer.indexOf('TypoSymbols') === -1) {
    legend_elems.append('rect').attr('x', xpos + boxwidth).attr('y', function (d, i) {
      last_pos = y_pos2 + i * boxgap + i * boxheight;
      return last_pos;
    }).attrs({ width: boxwidth, height: boxheight }).styles(function (d) {
      return { fill: d.color, stroke: d.color };
    });
  } else {
    legend_elems.append('image').attrs(function (d, i) {
      return {
        x: xpos + boxwidth,
        y: y_pos2 + i * boxgap + i * boxheight,
        width: boxwidth,
        height: boxheight,
        'xlink:href': d.image[0]
      };
    });
  }

  if (current_layers[layer].renderer.indexOf('Choropleth') > -1 || current_layers[layer].renderer.indexOf('PropSymbolsChoro') > -1 || current_layers[layer].renderer.indexOf('Gridded') > -1 || current_layers[layer].renderer.indexOf('Stewart') > -1) {
    var tmp_pos = void 0;
    legend_elems.append('text').attr('x', xpos + boxwidth * 2 + 10).attr('y', function (d, i) {
      tmp_pos = y_pos2 + i * boxheight + i * boxgap;
      return tmp_pos;
    }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
      return round_value(+d.value.split(' - ')[1], rounding_precision).toLocaleString();
    });

    legend_root.insert('text').attr('id', 'lgd_choro_min_val').attr('x', xpos + boxwidth * 2 + 10).attr('y', tmp_pos + boxheight + boxgap).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
      return round_value(data_colors_label[data_colors_label.length - 1].value.split(' - ')[0], rounding_precision).toLocaleString();
    });
  } else {
    legend_elems.append('text').attr('x', xpos + boxwidth * 2 + 10).attr('y', function (d, i) {
      return y_pos2 + i * boxheight + i * boxgap + boxheight * 2 / 3;
    }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(function (d) {
      return d.value;
    });
  }
  if (current_layers[layer].options_disc && current_layers[layer].options_disc.no_data) {
    var gp_no_data = legend_root.append('g');
    gp_no_data.append('rect').attrs({ x: xpos + boxheight,
      y: last_pos + 2 * boxheight,
      width: boxwidth,
      height: boxheight }).style('fill', current_layers[layer].options_disc.no_data).style('stroke', current_layers[layer].options_disc.no_data);

    gp_no_data.append('text').attrs({ x: xpos + boxwidth * 2 + 10, y: last_pos + 2.7 * boxheight, id: 'no_data_txt' }).styles({ 'alignment-baseline': 'middle', 'font-size': '10px' }).text(no_data_txt != null ? no_data_txt : 'No data');

    last_pos += 2 * boxheight;
  }

  legend_root.append('g').insert('text').attrs({ id: 'legend_bottom_note', x: xpos + boxheight, y: last_pos + 2 * boxheight }).style('font', "11px 'Enriqueta', arial, serif").text(note_bottom != null ? note_bottom : '');
  legend_root.call(drag_legend_func(legend_root));
  make_underlying_rect(legend_root, rect_under_legend, rect_fill_value);
  // legend_root.select('#legendtitle').text(title || "");
  make_legend_context_menu(legend_root, layer);
  return legend_root;
}

function display_box_value_symbol(layer_name) {
  var symbol_type = current_layers[layer_name].symbol,
      field = current_layers[layer_name].rendered_field,
      ref_symbols = document.getElementById(_app.layer_to_id.get(layer_name)).getElementsByTagName(symbol_type),
      type_param = symbol_type === 'circle' ? 'r' : 'width',
      non_empty = Array.prototype.filter.call(ref_symbols, function (d, i) {
    if (d[type_param].baseVal.value != 0) return d[type_param].baseVal.value;
  }),
      val_max = Math.abs(+non_empty[0].__data__.properties[field]);

  var redraw_sample_legend = function () {
    var legend_node = svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
    var rendered_field = current_layers[layer_name].rendered_field;
    var nested = legend_node.getAttribute('nested');
    var rounding_precision = legend_node.getAttribute('rounding_precision');
    var lgd_title = legend_node.querySelector('#legendtitle').innerHTML,
        lgd_subtitle = legend_node.querySelector('#legendsubtitle').innerHTML,
        note = legend_node.querySelector('#legend_bottom_note').innerHTML;
    return function (values) {
      if (values) {
        current_layers[layer_name].size_legend_symbol = values.sort(function (a, b) {
          return b.value - a.value;
        });
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
  }();

  var prom = make_confirm_dialog2('legend_symbol_values_box', layer_name + ' - ' + i18next.t('app_page.legend_symbol_values_box.title')).then(function (confirmed) {
    current_layers[layer_name].size_legend_symbol = confirmed ? current_layers[layer_name].size_legend_symbol : original_values;
    return Promise.resolve(confirmed);
  });

  var box_body = d3.select('.legend_symbol_values_box').select('.modal-content').style('width', '400px').select('.modal-body');
  box_body.append('p').style('text-align', 'center').insert('h3');
  // .html(i18next.t("app_page.legend_symbol_values_box.subtitle"));
  var sample_svg = box_body.append('div').attr('id', 'sample_svg').style('float', 'left').append('svg').attrs({ width: 200, height: 300, id: 'svg_sample_legend' });

  var values_to_use = [].concat(current_layers[layer_name].size_legend_symbol.map(function (f) {
    return cloneObj(f);
  }));

  var _current_layers$layer2 = _slicedToArray(current_layers[layer_name].size, 2),
      ref_value = _current_layers$layer2[0],
      ref_size = _current_layers$layer2[1];

  var propSize = new PropSizer(ref_value, ref_size, symbol_type);
  var input_zone = box_body.append('div').styles({ float: 'right', top: '100px', right: '20px', position: 'relative' });
  var a = input_zone.append('p');
  var b = input_zone.append('p');
  var c = input_zone.append('p');
  var d = input_zone.append('p');
  var original_values = [].concat(values_to_use);
  var val1 = a.insert('input').style('width', '80px').attrs({ class: 'without_spinner', type: 'number', max: val_max }).on('change', function () {
    var val = +this.value;
    if (isNaN(val)) return;
    values_to_use[0] = { size: propSize.scale(val), value: val };
    val2.attr('max', val);
    redraw_sample_legend(values_to_use);
  });
  var val2 = b.insert('input').style('width', '80px').attrs({ class: 'without_spinner', type: 'number', max: values_to_use[0].value, min: values_to_use[2] }).on('change', function () {
    var val = +this.value;
    if (isNaN(val)) return;
    values_to_use[1] = { size: propSize.scale(val), value: val };
    val1.attr('min', val);
    val3.attr('max', val);
    redraw_sample_legend(values_to_use);
  });
  var val3 = c.insert('input').style('width', '80px').attrs({ class: 'without_spinner', type: 'number', max: values_to_use[1].value, min: values_to_use[3].value }).on('change', function () {
    var val = +this.value;
    if (isNaN(val)) return;
    values_to_use[2] = { size: propSize.scale(val), value: val };
    val2.attr('min', val);
    val4.attr('max', val);
    redraw_sample_legend(values_to_use);
  });
  var val4 = d.insert('input').style('width', '80px').attrs({ class: 'without_spinner', type: 'number', min: 0, max: values_to_use[2].value }).on('change', function () {
    var val = +this.value;
    if (isNaN(val)) return;
    values_to_use[3] = { size: propSize.scale(val), value: val };
    val3.attr('min', val);
    redraw_sample_legend(values_to_use);
  });
  box_body.append('div').styles({ clear: 'both', 'text-align': 'center' }).append('p').styles({ 'text-align': 'center' }).insert('span').attrs({ class: 'button_st3' }).html(i18next.t('app_page.legend_symbol_values_box.reset')).on('click', function () {
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
  var layer_id = _app.layer_to_id.get(layer_name);
  var box_class = void 0,
      legend_node = void 0,
      title_content = void 0,
      subtitle_content = void 0,
      note_content = void 0,
      source_content = void 0;
  var legend_node_d3 = void 0,
      legend_boxes = void 0,
      no_data_txt = void 0,
      ratio_waffle_txt = void 0,
      rect_fill_value = {},
      original_rect_fill_value = void 0;

  bind_selections();
  if (document.querySelector('.' + box_class)) document.querySelector('.' + box_class).remove();
  var original_params = {
    title_content: title_content.textContent,
    y_title: title_content.y.baseVal[0].value,
    subtitle_content: subtitle_content.textContent,
    y_subtitle: subtitle_content.y.baseVal[0].value,
    note_content: note_content.textContent,
    no_data_txt: no_data_txt != null ? no_data_txt.textContent : null,
    ratio_waffle_txt: ratio_waffle_txt != null ? ratio_waffle_txt.textContent : null
  }; // , source_content: source_content.textContent ? source_content.textContent : ""

  if (legend_node.getAttribute('visible_rect') === 'true') {
    rect_fill_value = {
      color: legend_node.querySelector('#under_rect').style.fill,
      opacity: legend_node.querySelector('#under_rect').style.fillOpacity
    };
    original_rect_fill_value = cloneObj(rect_fill_value);
  }

  make_confirm_dialog2(box_class, layer_name).then(function (confirmed) {
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
    make_underlying_rect(legend_node_d3, legend_node_d3.select('#under_rect'), rect_fill_value);
    bind_selections();
  });
  var container = document.querySelectorAll('.' + box_class)[0];
  var box_body = d3.select(container).select('.modal-dialog').style('width', '375px').select('.modal-body');
  var current_nb_dec = void 0;

  box_body.append('p').style('text-align', 'center').insert('h3').html(i18next.t('app_page.legend_style_box.subtitle'));

  var a = box_body.append('p');
  a.append('span').html(i18next.t('app_page.legend_style_box.lgd_title'));

  a.append('input').styles({ float: 'right' }).attr('value', title_content.textContent).on('keyup', function () {
    title_content.textContent = this.value;
  });

  var b = box_body.append('p');
  b.insert('span').html(i18next.t('app_page.legend_style_box.var_name'));
  b.insert('input').attr('value', subtitle_content.textContent).styles({ float: 'right' }).on('keyup', function () {
    var empty = subtitle_content.textContent == '';
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

  var c = box_body.insert('p');
  c.insert('span').html(i18next.t('app_page.legend_style_box.additionnal_notes'));
  c.insert('input').attr('value', note_content.textContent).styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' }).on('keyup', function () {
    note_content.textContent = this.value;
  });

  if (no_data_txt) {
    var d = box_body.insert('p');
    d.insert('span').html(i18next.t('app_page.legend_style_box.no_data'));
    d.insert('input').attr('value', no_data_txt.textContent).styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' }).on('keyup', function () {
      no_data_txt.textContent = this.value;
    });
  } else if (ratio_waffle_txt) {
    var _d = box_body.insert('p');
    _d.insert('span').html(i18next.t('app_page.legend_style_box.ratio_waffle_txt'));
    _d.insert('input').attr('value', ratio_waffle_txt.textContent).styles({ float: 'right', 'font-family': '12px Gill Sans Extrabold, sans-serif' }).on('keyup', function () {
      ratio_waffle_txt.textContent = this.value;
    });
  }

  if (legend_id === 'legend_root_symbol') {
    var choice_break_value_section1 = box_body.insert('p').styles({ 'text-align': 'center', 'margin-top': '25px !important' });
    choice_break_value_section1.append('span').attr('class', 'button_disc').styles({ cursor: 'pointer' }).html(i18next.t('app_page.legend_style_box.choice_break_symbol')).on('click', function () {
      container.modal.hide();
      display_box_value_symbol(layer_name).then(function (confirmed) {
        container.modal.show();
        if (confirmed) {
          redraw_legends_symbols(svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join('')));
        }
      });
    });
  } else if (current_layers[layer_name].renderer !== 'TwoStocksWaffle' && current_layers[layer_name].renderer !== 'Categorical' && current_layers[layer_name].renderer !== 'TypoSymbols' && !(current_layers[layer_name].renderer === 'PropSymbolsTypo' && legend_id.indexOf('2'))) {
    // Float precision for label in the legend
    // (actually it's not really the float precision but an estimation based on
    // the string representation of only two values but it will most likely do the job in many cases)
    var max_nb_decimals = 0;
    var max_nb_left = 0;
    if (legend_id.indexOf('2') === -1 && legend_id.indexOf('links') === -1) {
      max_nb_decimals = get_max_nb_dec(layer_name);
      max_nb_left = get_max_nb_left_sep(layer_name);
    } else {
      var nb_dec = [],
          nb_left = [];
      legend_boxes.each(function (d) {
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
        var nbs = [],
            _nb_dec = [];
        legend_boxes.each(function () {
          nbs.push(this.textContent);
        });
        for (var i = 0; i < nbs.length; i++) {
          _nb_dec.push(get_nb_decimals(nbs[i]));
        }
        current_nb_dec = max_fast(_nb_dec);
      }
      if (max_nb_decimals > +current_nb_dec && max_nb_decimals > 18) {
        max_nb_decimals = 18;
      }
      var e = box_body.append('p');
      e.append('span').html(i18next.t('app_page.legend_style_box.float_rounding'));

      e.append('input').attrs({ id: 'precision_range', type: 'range', min: -+max_nb_left, max: max_nb_decimals, step: 1, value: current_nb_dec }).styles({ float: 'right', width: '90px', 'vertical-align': 'middle', 'margin-left': '10px' }).on('change', function () {
        var nb_float = +this.value;
        d3.select('#precision_change_txt').html(nb_float);
        legend_node.setAttribute('rounding_precision', nb_float);
        if (legend_id === 'legend_root') {
          for (var _i = 0; _i < legend_boxes._groups[0].length; _i++) {
            var values = legend_boxes._groups[0][_i].__data__.value.split(' - ');
            legend_boxes._groups[0][_i].innerHTML = round_value(+values[1], nb_float).toLocaleString();
          }
          var min_val = +legend_boxes._groups[0][legend_boxes._groups[0].length - 1].__data__.value.split(' - ')[0];
          legend_node.querySelector('#lgd_choro_min_val').innerHTML = round_value(min_val, nb_float).toLocaleString();
        } else if (legend_id === 'legend_root_symbol') {
          for (var _i2 = 0; _i2 < legend_boxes._groups[0].length; _i2++) {
            var value = legend_boxes._groups[0][_i2].__data__.value;
            legend_boxes._groups[0][_i2].innerHTML = round_value(+value, nb_float).toLocaleString();
          }
        } else if (legend_id === 'legend_root_lines_class') {
          for (var _i3 = 0; _i3 < legend_boxes._groups[0].length; _i3++) {
            var _value = legend_boxes._groups[0][_i3].__data__.value[1];
            legend_boxes._groups[0][_i3].innerHTML = round_value(+_value, nb_float).toLocaleString();
          }
          var _min_val = +legend_boxes._groups[0][legend_boxes._groups[0].length - 1].__data__.value[0];
          legend_node.querySelector('#lgd_choro_min_val').innerHTML = round_value(_min_val, nb_float).toLocaleString();
        }
      });
      e.append('span').styles({ float: 'right' }).attr('id', 'precision_change_txt').html('' + current_nb_dec);
    }
  }

  if (legend_id === 'legend_root') {
    var current_state = +legend_node.getAttribute('boxgap') === 0;
    var gap_section = box_body.insert('p');
    gap_section.append('input').style('margin-left', '0px').attrs({ type: 'checkbox', id: 'style_lgd' }).on('change', function () {
      var rendered_field = current_layers[layer_name].rendered_field2 ? current_layers[layer_name].rendered_field2 : current_layers[layer_name].rendered_field;
      legend_node = svg_map.querySelector(['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
      var boxgap = +legend_node.getAttribute('boxgap') == 0 ? 4 : 0;
      var rounding_precision = legend_node.getAttribute('rounding_precision');
      var transform_param = legend_node.getAttribute('transform'),
          lgd_title = legend_node.querySelector('#legendtitle').innerHTML,
          lgd_subtitle = legend_node.querySelector('#legendsubtitle').innerHTML,
          note = legend_node.querySelector('#legend_bottom_note').innerHTML;
      var _no_data_txt = legend_node.querySelector('#no_data_txt');
      _no_data_txt = _no_data_txt != null ? _no_data_txt.textContent : null;
      legend_node.remove();
      createLegend_choro(layer_name, rendered_field, lgd_title, lgd_subtitle, boxgap, rect_fill_value, rounding_precision, _no_data_txt, note);
      bind_selections();
      if (transform_param) {
        svg_map.querySelector(['#legend_root.lgdf_', _app.layer_to_id.get(layer_name)].join('')).setAttribute('transform', transform_param);
      }
    });
    gap_section.append('label').attrs({ for: 'style_lgd', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.gap_boxes' }).html(i18next.t('app_page.legend_style_box.gap_boxes'));

    document.getElementById('style_lgd').checked = current_state;
  } else if (legend_id === 'legend_root_symbol') {
    var _current_state = legend_node.getAttribute('nested') === 'true';
    var _gap_section = box_body.insert('p');
    _gap_section.append('input').style('margin-left', '0px').attrs({ id: 'style_lgd', type: 'checkbox' }).on('change', function () {
      legend_node = svg_map.querySelector(['#legend_root_symbol.lgdf_', _app.layer_to_id.get(layer_name)].join(''));
      var rendered_field = current_layers[layer_name].rendered_field;
      var nested = legend_node.getAttribute('nested') === 'true' ? 'false' : 'true';
      var rounding_precision = legend_node.getAttribute('rounding_precision');
      var transform_param = legend_node.getAttribute('transform'),
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
    _gap_section.append('label').attrs({ for: 'style_lgd', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.nested_symbols' }).html(i18next.t('app_page.legend_style_box.nested_symbols'));
    document.getElementById('style_lgd').checked = _current_state;
  }
  // Todo : Reactivate this functionnality :
  //    box_body.insert("p").html("Display features count ")
  //            .insert("input").attr("type", "checkbox")
  //            .on("change", function(){
  //                alert("to be done!");
  //            });

  var rectangle_options1 = box_body.insert('p');
  rectangle_options1.insert('input').style('margin-left', '0px').attrs({ type: 'checkbox',
    id: 'rect_lgd_checkbox',
    checked: rect_fill_value.color === undefined ? null : true }).on('change', function () {
    if (this.checked) {
      rectangle_options2.style('display', '');
      var r = document.getElementById('choice_color_under_rect');
      rect_fill_value = r ? { color: r.value, opacity: 1 } : { color: '#ffffff', opacity: 1 };
    } else {
      rectangle_options2.style('display', 'none');
      rect_fill_value = {};
    }
    make_underlying_rect(legend_node_d3, legend_node_d3.select('#under_rect'), rect_fill_value);
  });
  rectangle_options1.append('label').attrs({ for: 'rect_lgd_checkbox', class: 'i18n', 'data-i18n': '[html]app_page.legend_style_box.under_rectangle' }).html(i18next.t('app_page.legend_style_box.under_rectangle'));

  var rectangle_options2 = rectangle_options1.insert('span').styles({ float: 'right', display: rect_fill_value.color === undefined ? 'none' : '' });
  rectangle_options2.insert('input').attrs({ id: 'choice_color_under_rect',
    type: 'color',
    value: rect_fill_value.color === undefined ? '#ffffff' : rgb2hex(rect_fill_value.color) }).on('change', function () {
    rect_fill_value = { color: this.value, opacity: 1 };
    make_underlying_rect(legend_node_d3, legend_node_d3.select('#under_rect'), rect_fill_value);
  });
}

function move_legends() {
  var xy0_map = get_map_xy0();
  var dim_width = w + xy0_map.x;
  var dim_heght = h + xy0_map.y;
  var legends = [svg_map.querySelectorAll('.legend_feature'), svg_map.querySelectorAll('#scale_bar.legend')];
  for (var j = 0; j < 2; ++j) {
    var legends_type = legends[j];
    for (var i = 0, i_len = legends_type.length; i < i_len; ++i) {
      var legend_bbox = legends_type[i].getBoundingClientRect();
      if (legend_bbox.left + legend_bbox.width > dim_width) {
        var current_transform = legends_type[i].getAttribute('transform');

        var _$exec$1$split = /\(([^\)]+)\)/.exec(current_transform)[1].split(','),
            _$exec$1$split2 = _slicedToArray(_$exec$1$split, 2),
            val_x = _$exec$1$split2[0],
            val_y = _$exec$1$split2[1];

        var trans_x = legend_bbox.left + legend_bbox.width - dim_width;
        legends_type[i].setAttribute('transform', ['translate(', [+val_x - trans_x, val_y], ')'].join(''));
      }
      if (legend_bbox.top + legend_bbox.height > dim_heght) {
        var _current_transform = legends_type[i].getAttribute('transform');

        var _$exec$1$split3 = /\(([^\)]+)\)/.exec(_current_transform)[1].split(','),
            _$exec$1$split4 = _slicedToArray(_$exec$1$split3, 2),
            _val_x = _$exec$1$split4[0],
            _val_y = _$exec$1$split4[1];

        var trans_y = legend_bbox.top + legend_bbox.height - dim_heght;
        legends_type[i].setAttribute('transform', ['translate(', [_val_x, +_val_y - trans_y], ')'].join(''));
      }
    }
  }
}

var get_max_nb_dec = function get_max_nb_dec(layer_name) {
  if (!current_layers[layer_name] || !current_layers[layer_name].colors_breaks) {
    return;
  }
  var max = 0;
  current_layers[layer_name].colors_breaks.forEach(function (el) {
    var tmp = el[0].split(' - ');
    var p1 = tmp[0].indexOf('.');
    var p2 = tmp[1].indexOf('.');
    if (p1 > -1) {
      if (tmp[0].length - 1 - p1 > max) {
        max = tmp[0].length - 1 - tmp[0].indexOf('.');
      }
    }
    if (p2 > -1) {
      if (tmp[1].length - 1 - p2 > max) {
        max = tmp[1].length - 1 - tmp[1].indexOf('.');
      }
    }
  });
  return max;
};

function _get_max_nb_left_sep(values) {
  return max_fast(values.map(function (d) {
    return ('' + d).split('.')[0].length;
  }));
}

var get_max_nb_left_sep = function get_max_nb_left_sep(layer_name) {
  if (!current_layers[layer_name] || !current_layers[layer_name].colors_breaks) {
    return;
  }
  var nb_left = [];
  current_layers[layer_name].colors_breaks.forEach(function (el) {
    var tmp = el[0].split(' - ');
    var p1 = tmp[0].indexOf('.'),
        p2 = tmp[1].indexOf('.');
    nb_left.push(p1);
    nb_left.push(p2);
  });
  return min_fast(nb_left);
};
'use strict';

/* eslint-disable no-loop-func */

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function get_map_template() {
  var getPropSymbolCurrentPos = function getPropSymbolCurrentPos(selection, type_symbol) {
    var result = [];
    var nbFt = selection.length;
    if (type_symbol === 'circle') {
      for (var i = 0; i < nbFt; i++) {
        result.push({
          cx: selection[i].getAttribute('cx'),
          cy: selection[i].getAttribute('cy')
        });
      }
    } else {
      for (var _i = 0; _i < nbFt; _i++) {
        result.push({
          x: selection[_i].getAttribute('x'),
          y: selection[_i].getAttribute('y')
        });
      }
    }
    return result;
  };
  var getWaffleCurrentPos = function getWaffleCurrentPos(selection) {
    var result = [];
    var nbFt = selection.length;
    for (var i = 0; i < nbFt; i++) {
      result.push(selection[i].getAttribute('transform'));
    }
    return result;
  };
  var get_legend_info = function get_legend_info(lgd_node) {
    var type_lgd = lgd_node.id;
    var rect_fill_value = lgd_node.getAttribute('visible_rect') === 'true' ? { color: lgd_node.querySelector('#under_rect').style.fill,
      opacity: lgd_node.querySelector('#under_rect').style.fillOpacity } : undefined;
    var result = {
      type: type_lgd,
      display: lgd_node.getAttribute('display'),
      transform: lgd_node.getAttribute('transform'),
      field: lgd_node.getAttribute('layer_field'),
      rounding_precision: lgd_node.getAttribute('rounding_precision'),
      rect_fill_value: rect_fill_value,
      title: lgd_node.querySelector('#legendtitle').innerHTML,
      subtitle: lgd_node.querySelector('#legendsubtitle').innerHTML,
      bottom_note: lgd_node.querySelector('#legend_bottom_note').innerHTML
    };
    if (type_lgd === 'legend_root') {
      result.boxgap = lgd_node.getAttribute('boxgap');
      var no_data = lgd_node.querySelector('#no_data_txt');
      if (no_data) result.no_data_txt = no_data.innerHTML;
    } else if (type_lgd === 'legend_root_symbol') {
      result.nested_symbols = lgd_node.getAttribute('nested');
    } else if (type_lgd === 'legend_root_waffle') {
      var lyr_name = lgd_node.getAttribute('layer_name');
      result.field = current_layers[lyr_name].rendered_field;
      result.ratio_txt = lgd_node.querySelector('#ratio_txt').innerHTML;
    }
    return result;
  };

  var map_config = {},
      layers_style = [],
      layers = map.selectAll('g.layer'),
      map_title = document.getElementById('map_title'),
      layout_features = document.querySelectorAll('.legend:not(.title):not(.legend_feature)'),
      zoom_transform = d3.zoomTransform(svg_map);

  map_config.projection = current_proj_name;
  if (current_proj_name === 'def_proj4') {
    map_config.custom_projection = _app.last_projection;
  }
  map_config.projection_scale = proj.scale();
  map_config.projection_translate = proj.translate();
  map_config.projection_center = proj.center();
  map_config.projection_rotation = proj.rotate();
  map_config.projection_parallels = proj.parallels !== undefined ? proj.parallels() : undefined;
  map_config.projection_parallel = proj.parallel !== undefined ? proj.parallel() : undefined;
  map_config.zoom_translate = [zoom_transform.x, zoom_transform.y];
  map_config.zoom_scale = zoom_transform.k;
  map_config.div_width = +w;
  map_config.div_height = +h;
  map_config.n_layers = layers._groups[0].length;
  map_config.background_color = map.style('background-color');
  map_config.canvas_rotation = typeof canvas_rotation_value === 'string' ? canvas_rotation_value.match(/\d+/) : undefined;
  map_config.custom_palettes = Array.from(_app.custom_palettes.entries());

  if (map_title) {
    map_config.title = {
      content: map_title.textContent,
      x: map_title.getElementsByTagName('text')[0].getAttribute('x'),
      y: map_title.getElementsByTagName('text')[0].getAttribute('y'),
      style: map_title.getElementsByTagName('text')[0].getAttribute('style')
    };
  }

  // Save the provided dataset if it wasn't joined to the geo layer :
  if (joined_dataset.length > 0 && field_join_map.length === 0) {
    map_config.joined_dataset = joined_dataset[0];
    map_config.dataset_name = dataset_name;
  }

  map_config.global_order = Array.from(svg_map.querySelectorAll('.legend,.layer')).map(function (ft) {
    return ['#', ft.id, '.', ft.className.baseVal.split(' ').join('.')].join('');
  });

  map_config.layout_features = {};
  if (layout_features) {
    for (var i = 0; i < layout_features.length; i++) {
      var ft = layout_features[i];
      if (ft.id === 'scale_bar') {
        map_config.layout_features.scale_bar = {
          bar_size: scaleBar.bar_size,
          displayed: scaleBar.displayed,
          dist: scaleBar.dist,
          dist_txt: scaleBar.dist_txt,
          fixed_size: scaleBar.fixed_size,
          precision: scaleBar.precision,
          unit: scaleBar.unit,
          x: scaleBar.x,
          y: scaleBar.y,
          transform: scaleBar.Scale._groups[0][0].getAttribute('transform') || ''
        };
      } else if (ft.id === 'north_arrow') {
        var n_arr = northArrow.arrow_img._groups[0][0];
        map_config.layout_features.north_arrow = {
          arrow_img: ft.getAttribute('href'),
          displayed: northArrow.displayed,
          x_img: n_arr.getAttribute('x'),
          y_img: n_arr.getAttribute('y'),
          x_center: northArrow.x_center,
          y_center: northArrow.y_center,
          size: n_arr.getAttribute('width')
        };
      } else if (ft.classList.contains('user_ellipse')) {
        if (!map_config.layout_features.user_ellipse) map_config.layout_features.user_ellipse = [];
        var ellps = ft.childNodes[0];
        map_config.layout_features.user_ellipse.push({
          rx: ellps.getAttribute('rx'),
          ry: ellps.getAttribute('ry'),
          cx: ellps.getAttribute('cx'),
          cy: ellps.getAttribute('cy'),
          stroke: ellps.style.stroke,
          stroke_width: ellps.style.strokeWidth,
          id: ft.id
        });
      } else if (ft.classList.contains('user_rectangle')) {
        if (!map_config.layout_features.user_rectangle) {
          map_config.layout_features.user_rectangle = [];
        }
        var rect = ft.childNodes[0];
        map_config.layout_features.user_rectangle.push({
          x: rect.getAttribute('x'),
          y: rect.getAttribute('y'),
          width: rect.getAttribute('width'),
          height: rect.getAttribute('height'),
          style: rect.getAttribute('style'),
          id: ft.id
        });
      } else if (ft.classList.contains('arrow')) {
        if (!map_config.layout_features.arrow) map_config.layout_features.arrow = [];
        var line = ft.childNodes[0];
        map_config.layout_features.arrow.push({
          stroke_width: line.style.strokeWidth,
          stroke: line.style.stroke,
          pt1: [line.x1.baseVal.value, line.y1.baseVal.value],
          pt2: [line.x2.baseVal.value, line.y2.baseVal.value],
          id: ft.id,
          marker_head: line.getAttribute('marker-end')
        });
      } else if (ft.classList.contains('txt_annot')) {
        if (!map_config.layout_features.text_annot) map_config.layout_features.text_annot = [];
        var text = ft.querySelector('text');
        map_config.layout_features.text_annot.push({
          id: ft.id,
          content: Array.prototype.map.call(text.querySelectorAll('tspan'), function (el) {
            return el.innerHTML;
          }).join('\n'),
          style: text.getAttribute('style'),
          position_x: text.getAttribute('x'),
          position_y: text.getAttribute('y'),
          transform: text.getAttribute('transform')
        });
      } else if (ft.classList.contains('single_symbol')) {
        if (!map_config.layout_features.single_symbol) {
          map_config.layout_features.single_symbol = [];
        }
        var img = ft.childNodes[0];
        map_config.layout_features.single_symbol.push({
          id: ft.id,
          x: img.getAttribute('x'),
          y: img.getAttribute('y'),
          width: img.getAttribute('width'),
          height: img.getAttribute('height'),
          href: img.getAttribute('href'),
          scalable: ft.classList.contains('scalable-legend')
        });
      }
    }
  }
  for (var _i2 = map_config.n_layers - 1; _i2 > -1; --_i2) {
    layers_style[_i2] = {};
    var layer_style_i = layers_style[_i2],
        layer_id = layers._groups[0][_i2].id,
        layer_name = _app.id_to_layer.get(layer_id),
        current_layer_prop = current_layers[layer_name],
        layer_type = (current_layer_prop.sphere ? 'sphere' : false) || (current_layer_prop.graticule ? 'graticule' : 'layer'),
        nb_ft = current_layer_prop.n_features;
    var selection = void 0;

    layer_style_i.layer_name = layer_name;
    layer_style_i.layer_type = layer_type;
    layer_style_i.n_features = nb_ft;
    layer_style_i.visible = layers._groups[0][_i2].style.visibility !== 'hidden' ? '' : 'hidden';
    var lgd = document.getElementsByClassName('lgdf_' + layer_id);
    if (lgd.length === 0) {
      layer_style_i.legend = undefined;
    } else if (lgd.length === 1) {
      layer_style_i.legend = [get_legend_info(lgd[0])];
    } else if (lgd.length === 2) {
      layer_style_i.legend = lgd[0].id === 'legend_root' ? [get_legend_info(lgd[0]), get_legend_info(lgd[1])] : [get_legend_info(lgd[1]), get_legend_info(lgd[0])];
    }

    if (map.select('#' + layer_id).attr('filter')) {
      layer_style_i.filter_shadow = true;
    }

    if (current_layer_prop['stroke-width-const']) {
      layer_style_i['stroke-width-const'] = current_layer_prop['stroke-width-const'];
    }
    if (current_layer_prop.pointRadius !== undefined) {
      layer_style_i.pointRadius = current_layer_prop.pointRadius;
    }
    if (current_layer_prop.fixed_stroke !== undefined) {
      layer_style_i.fixed_stroke = current_layer_prop.fixed_stroke;
    }
    if (current_layer_prop.colors_breaks) {
      layer_style_i.colors_breaks = current_layer_prop.colors_breaks;
    }
    if (current_layer_prop.options_disc !== undefined) {
      layer_style_i.options_disc = current_layer_prop.options_disc;
    }
    if (current_layer_prop.targeted) {
      selection = map.select('#' + layer_id).selectAll('path');
      layer_style_i.fill_opacity = selection.style('fill-opacity');
      layer_style_i.targeted = true;
      layer_style_i.topo_geom = true;
      // layer_style_i.topo_geom = JSON.stringify(_target_layer_file);
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.fields_type = current_layer_prop.fields_type;
      layer_style_i.stroke_color = selection.style('stroke');
    } else if (layer_type === 'sphere' || layer_type === 'graticule' || layer_name === 'World') {
      selection = map.select('#' + layer_id).selectAll('path');
      layer_style_i.fill_color = rgb2hex(selection.style('fill'));
      layer_style_i.stroke_color = rgb2hex(selection.style('stroke'));
      if (layer_type === 'graticule') {
        layer_style_i.stroke_dasharray = current_layers.Graticule.dasharray;
        layer_style_i.step = current_layers.Graticule.step;
      }
    } else if (!current_layer_prop.renderer) {
      selection = map.select('#' + layer_id).selectAll('path');
      layer_style_i.fill_opacity = selection.style('fill-opacity');
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.topo_geom = true;
      // layer_style_i.topo_geom = String(current_layer_prop.key_name);
      layer_style_i.stroke_color = selection.style('stroke');
    } else if (current_layer_prop.renderer.indexOf('PropSymbols') > -1 && current_layer_prop.type !== 'Line') {
      var type_symbol = current_layer_prop.symbol;
      selection = map.select('#' + layer_id).selectAll(type_symbol);
      var features = Array.prototype.map.call(svg_map.querySelector('#' + layer_id).getElementsByTagName(type_symbol), function (d) {
        return d.__data__;
      });
      layer_style_i.symbol = type_symbol;
      layer_style_i.size_legend_symbol = current_layer_prop.size_legend_symbol;
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      if (current_layer_prop.rendered_field2) {
        layer_style_i.rendered_field2 = current_layer_prop.rendered_field2;
      }
      layer_style_i.current_position = getPropSymbolCurrentPos(selection._groups[0], type_symbol);
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.size = current_layer_prop.size;
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.stroke_color = selection.style('stroke');
      layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;
      layer_style_i.geo_pt = {
        type: 'FeatureCollection',
        features: features
      };
      if (current_layer_prop.renderer === 'PropSymbolsTypo') {
        layer_style_i.color_map = [].concat(_toConsumableArray(current_layer_prop.color_map));
      }
      if (current_layer_prop.break_val) {
        layer_style_i.break_val = current_layer_prop.break_val;
      }
    } else if (current_layer_prop.renderer.indexOf('PropSymbols') > -1 && current_layer_prop.type === 'Line') {
      var _type_symbol = current_layer_prop.symbol;
      selection = map.select('#' + layer_id).selectAll('path');
      var _features = Array.prototype.map.call(svg_map.querySelector('#' + layer_id).getElementsByTagName('path'), function (d) {
        return d.__data__;
      });
      layer_style_i.symbol = _type_symbol;
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      if (current_layer_prop.rendered_field2) {
        layer_style_i.rendered_field2 = current_layer_prop.rendered_field2;
      }
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.size = current_layer_prop.size;
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;
      layer_style_i.geo_line = {
        type: 'FeatureCollection',
        features: _features
      };
      if (current_layer_prop.renderer === 'PropSymbolsTypo') {
        layer_style_i.color_map = [].concat(_toConsumableArray(current_layer_prop.color_map));
      }
      if (current_layer_prop.break_val) {
        layer_style_i.break_val = current_layer_prop.break_val;
      }
    } else if (['Stewart', 'Gridded', 'Choropleth', 'Categorical', 'Carto_doug', 'OlsonCarto'].indexOf(current_layer_prop.renderer) > -1) {
      (function () {
        selection = map.select('#' + layer_id).selectAll('path');
        layer_style_i.renderer = current_layer_prop.renderer;
        layer_style_i.topo_geom = true;
        // layer_style_i.topo_geom = String(current_layer_prop.key_name);
        layer_style_i.fill_color = current_layer_prop.fill_color;
        layer_style_i.stroke_color = selection.style('stroke');
        layer_style_i.rendered_field = current_layer_prop.rendered_field;
        layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;
        var color_by_id = [];
        var params = current_layer_prop.type === 'Line' ? 'stroke' : 'fill';
        selection.each(function () {
          color_by_id.push(rgb2hex(this.style[params]));
        });
        layer_style_i.color_by_id = color_by_id;
        if (current_layer_prop.renderer !== 'Categorical') {
          layer_style_i.options_disc = current_layer_prop.options_disc;
        } else {
          layer_style_i.color_map = [].concat(_toConsumableArray(current_layer_prop.color_map));
        }

        if (current_layer_prop.renderer === 'Stewart') {
          layer_style_i.color_palette = current_layer_prop.color_palette;
        } else if (current_layer_prop.renderer === 'OlsonCarto') {
          layer_style_i.scale_max = current_layer_prop.scale_max;
          layer_style_i.scale_byFeature = current_layer_prop.scale_byFeature;
        }
      })();
    } else if (current_layer_prop.renderer === 'Links' || current_layer_prop.renderer === 'DiscLayer') {
      selection = map.select('#' + layer_id).selectAll('path');
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.topo_geom = true;
      // layer_style_i.topo_geom = String(current_layer_prop.key_name);
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;
      layer_style_i.size = current_layer_prop.size;
      layer_style_i.min_display = current_layer_prop.min_display;
      layer_style_i.breaks = current_layer_prop.breaks;
      // layer_style_i.topo_geom = String(current_layer_prop.key_name);
      if (current_layer_prop.renderer === 'Links') {
        layer_style_i.linksbyId = current_layer_prop.linksbyId.slice(0, nb_ft);
      }
    } else if (current_layer_prop.renderer === 'TypoSymbols') {
      selection = map.select('#' + layer_id).selectAll('image');
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.symbols_map = [].concat(_toConsumableArray(current_layer_prop.symbols_map));
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;

      var state_to_save = [];
      var selec = selection._groups[0];
      for (var ix = 0; ix < selec.length; ix++) {
        var _ft = selec[ix];
        state_to_save.push({
          display: _ft.style.display,
          data: _ft.__data__,
          pos: [_ft.getAttribute('x'), _ft.getAttribute('y')],
          size: _ft.getAttribute('width')
        });
      }
      layer_style_i.current_state = state_to_save;
    } else if (current_layer_prop.renderer === 'Label') {
      selection = map.select('#' + layer_id).selectAll('text');
      var _selec = document.getElementById(layer_id).getElementsByTagName('text');
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      layer_style_i.default_font = current_layer_prop.default_font;
      layer_style_i.default_size = +current_layer_prop.default_size.slice(0, 2);
      layer_style_i.fill_color = current_layer_prop.fill_color;
      var _features2 = [];
      var current_position = [];
      for (var j = _selec.length - 1; j > -1; j--) {
        var _s = _selec[j];
        _features2.push(_s.__data__);
        current_position.push([+_s.getAttribute('x'), +_s.getAttribute('y'), _s.style.display, _s.style.fontSize, _s.style.fontFamily, _s.style.fill, _s.textContent]);
      }
      layer_style_i.data_labels = _features2;
      layer_style_i.current_position = current_position;
    } else if (current_layer_prop.renderer === 'TwoStocksWaffle') {
      var _type_symbol2 = current_layer_prop.symbol;
      selection = map.select('#' + layer_id).selectAll(_type_symbol2);
      layer_style_i.symbol = _type_symbol2;
      layer_style_i.rendered_field = current_layer_prop.rendered_field;
      layer_style_i.renderer = current_layer_prop.renderer;
      layer_style_i.size = current_layer_prop.size;
      layer_style_i.fill_color = current_layer_prop.fill_color;
      layer_style_i.ratio = current_layer_prop.ratio;
      layer_style_i.nCol = current_layer_prop.nCol;
      layer_style_i.ref_layer_name = current_layer_prop.ref_layer_name;
      layer_style_i.result_data = JSON.stringify(result_data[layer_name]);
      layer_style_i.current_position = getWaffleCurrentPos(svg_map.querySelectorAll('#' + layer_id + ' > g'));
    } else {
      selection = map.select('#' + layer_id).selectAll('path');
    }
    layer_style_i.stroke_opacity = selection.style('stroke-opacity');
    layer_style_i.fill_opacity = selection.style('fill-opacity');
  }

  // return Promise.all(
  // layers_style.map(obj => (obj.topo_geom && !obj.targeted)
  //      ? xhrequest("GET", "/get_layer/" + obj.topo_geom, null, false) : null))
  return Promise.all(layers_style.map(function (obj) {
    return obj.topo_geom ? serialize_layer_to_topojson(obj.layer_name) : null;
  })).then(function (result) {
    for (var _i3 = 0; _i3 < layers_style.length; _i3++) {
      if (result[_i3]) {
        layers_style[_i3].topo_geom = result[_i3];
      }
    }
    // console.log(JSON.stringify({"map_config": map_config, "layers": layers_style}))
    return JSON.stringify({
      map_config: map_config,
      layers: layers_style,
      info: { version: _app.version }
    });
  });
}

// Function triggered when the user request a download of its map preferences
function save_map_template() {
  document.getElementById('overlay').style.display = '';
  get_map_template().then(function (json_params) {
    var url = 'data:text/json;charset=utf-8,' + encodeURIComponent(json_params);
    document.getElementById('overlay').style.display = 'none';
    clickLinkFromDataUrl(url, 'magrit_project.json');
  });
}

function load_map_template() {
  var prepareReading = function prepareReading(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onloadend = function () {
      apply_user_preferences(reader.result);
    };
    reader.readAsText(file);
  };
  var input_button = d3.select(document.createElement('input')).attrs({ type: 'file', name: 'file', accept: '.json' }).on('change', function () {
    prepareReading(d3.event);
  });

  input_button.node().dispatchEvent(new MouseEvent('click'));
}

function display_error_loading_project(error) {
  swal({
    title: i18next.t('app_page.common.error') + '!',
    text: '' + i18next.t('app_page.common.error_map_project') + (error || 'Unknown'),
    type: 'error',
    allowOutsideClick: false
  });
}

function apply_user_preferences(json_pref) {
  var getAppVersion = function getAppVersion(info) {
    if (!info || !info.version) {
      return { app_version: undefined, p_version: undefined };
    }
    var app_version = info.version;
    var version_split = app_version.split('.');
    var p_version = {
      major: version_split[0],
      minor: version_split[1],
      patch: version_split[2]
    };
    return { app_version: app_version, p_version: p_version };
  };
  var preferences = void 0;
  try {
    preferences = JSON.parse(json_pref);
  } catch (err) {
    display_error_loading_project(i18next.t('app_page.common.error_invalid_map_project') + err);
    return;
  }
  var map_config = preferences.map_config;
  var layers = preferences.layers;

  var _getAppVersion = getAppVersion(preferences.info),
      app_version = _getAppVersion.app_version,
      p_version = _getAppVersion.p_version;

  if (!layers || !map_config) {
    display_error_loading_project(i18next.t('app_page.common.error_invalid_map_project'));
    return;
  }
  // Restore the state of the page (without open functionnality)
  if (window.fields_handler) {
    clean_menu_function();
  }
  // Clean the values remembered for the user from the previous rendering if any :
  reset_user_values();
  {
    var layer_names = Object.getOwnPropertyNames(current_layers);
    for (var i = 0, nb_layers = layer_names.length; i < nb_layers; i++) {
      remove_layer_cleanup(layer_names[i]);
    }
    var _l = void 0;
    var _ll = void 0;
    // Make sure there is no layers and legend/layout features on the map :
    _l = svg_map.childNodes;
    _ll = _l.length;
    for (var _i4 = _ll - 1; _i4 > -1; _i4--) {
      _l[_i4].remove();
    }
    // And in the layer manager :
    _l = layer_list.node().childNodes;
    _ll = _l.length;
    for (var _i5 = _ll - 1; _i5 > -1; _i5--) {
      _l[_i5].remove();
    }
    // Get a new object for where we are storing the main properties :
    current_layers = {};
  }

  var a = document.getElementById('overlay');
  a.style.display = '';
  a.querySelector('button').style.display = 'none';

  var restorePreviousPos = function restorePreviousPos(layer_id, current_position, type_symbol) {
    var selection = map.select('#' + layer_id).selectAll(type_symbol);
    if (type_symbol === 'circle') {
      selection.attrs(function (d, i) {
        return {
          cx: current_position[i].cx,
          cy: current_position[i].cy
        };
      });
    } else {
      selection.attrs(function (d, i) {
        return {
          x: current_position[i].x,
          y: current_position[i].y
        };
      });
    }
  };
  var restorePreviousPosWaffle = function restorePreviousPosWaffle(layer_id, current_position, type_symbol) {
    map.select('#' + layer_id).selectAll('g').attr('transform', function (d, i) {
      return current_position[i];
    });
  };

  var set_final_param = function set_final_param() {
    setTimeout(function () {
      var _zoom = svg_map.__zoom;
      _zoom.k = map_config.zoom_scale;
      _zoom.x = map_config.zoom_translate[0];
      _zoom.y = map_config.zoom_translate[1];
      zoom_without_redraw();
      s = map_config.projection_scale;
      t = map_config.projection_translate;
      proj.scale(s).translate(t).rotate(map_config.projection_rotation);
      path = d3.geoPath().projection(proj).pointRadius(4);
      map.selectAll('.layer').selectAll('path').attr('d', path);
      handleClipPath(current_proj_name);
      reproj_symbol_layer();
      apply_layout_lgd_elem();
      if (!map_config.global_order) {
        // Old method to reorder layers :
        if (layers.length > 1) {
          var desired_order = layers.map(function (i) {
            return i.layer_name;
          });
          reorder_elem_list_layer(desired_order);
          desired_order.reverse();
          reorder_layers(desired_order);
        }
      } else if (p_version.minor <= 4) {
        reorder_layers_elem_legends(map_config.global_order);
        if (layers.length > 1) {
          var _desired_order = layers.map(function (i) {
            return i.layer_name;
          });
          reorder_elem_list_layer(_desired_order);
          _desired_order.reverse();
          reorder_layers(_desired_order);
        }
        // Current method to reorder layers:
      } else if (map_config.global_order && map_config.global_order.length > 1 && (p_version.minor > 4 || p_version.minor === 4 && p_version.patch > 1)) {
        var order = layers.map(function (i) {
          return i.layer_name;
        });
        reorder_elem_list_layer(order);
        reorder_layers_elem_legends(map_config.global_order);
      }
      if (map_config.canvas_rotation) {
        document.getElementById('form_rotate').value = map_config.canvas_rotation;
        document.getElementById('canvas_rotation_value_txt').value = map_config.canvas_rotation;
        rotate_global(map_config.canvas_rotation);
      }
      var overlay_elem = document.getElementById('overlay');
      overlay_elem.style.display = 'none';
      overlay_elem.querySelector('button').style.display = '';
      var targeted_layer = Object.getOwnPropertyNames(user_data)[0];
      if (targeted_layer) getAvailablesFunctionnalities(targeted_layer);
      for (var ii = 0; ii < at_end.length; ii++) {
        at_end[ii][0](at_end[ii][1], at_end[ii][2], at_end[ii][3]);
      }
    }, 150);
  };

  function apply_layout_lgd_elem() {
    if (map_config.title) {
      // Create the title object :
      handle_title(map_config.title.content);
      // Use its old properties :
      var title = document.getElementById('map_title').getElementsByTagName('text')[0];
      title.setAttribute('x', map_config.title.x);
      title.setAttribute('y', map_config.title.y);
      title.setAttribute('style', map_config.title.style);
      // Also fill the input field on the left menu :
      document.querySelector('input#title.list_elem_section4').value = map_config.title.content;
    }
    if (map_config.layout_features) {
      if (map_config.layout_features.scale_bar) {
        scaleBar.create();
        scaleBar.bar_size = map_config.layout_features.scale_bar.bar_size;
        scaleBar.displayed = map_config.layout_features.scale_bar.displayed;
        scaleBar.dist = map_config.layout_features.scale_bar.dist;
        scaleBar.dist_txt = map_config.layout_features.scale_bar.dist_txt;
        scaleBar.fixed_size = map_config.layout_features.scale_bar.fixed_size;
        scaleBar.precision = map_config.layout_features.scale_bar.precision;
        scaleBar.x = map_config.layout_features.scale_bar.x;
        scaleBar.y = map_config.layout_features.scale_bar.y;
        scaleBar.Scale._groups[0][0].setAttribute('transform', map_config.layout_features.scale_bar.transform);
        // We should be able to avoid this condition and always use the same method
        // but while waiting to test it more it may be safer to do it that way
        if (scaleBar.fixed_size === false) {
          scaleBar.update();
        } else {
          scaleBar.resize();
        }
      }
      if (map_config.layout_features.north_arrow) {
        northArrow.display();
        northArrow.arrow_img._groups[0][0].setAttribute('x', map_config.layout_features.north_arrow.x_img);
        northArrow.arrow_img._groups[0][0].setAttribute('y', map_config.layout_features.north_arrow.y_img);
        northArrow.arrow_img._groups[0][0].setAttribute('width', map_config.layout_features.north_arrow.size);
        northArrow.arrow_img._groups[0][0].setAttribute('height', map_config.layout_features.north_arrow.size);
        northArrow.under_rect._groups[0][0].setAttribute('x', map_config.layout_features.north_arrow.x_img);
        northArrow.under_rect._groups[0][0].setAttribute('y', map_config.layout_features.north_arrow.y_img);
        northArrow.x_center = map_config.layout_features.north_arrow.x_center;
        northArrow.y_center = map_config.layout_features.north_arrow.y_center;
        northArrow.displayed = map_config.layout_features.north_arrow.displayed;
      }
      if (map_config.layout_features.arrow) {
        for (var _i6 = 0; _i6 < map_config.layout_features.arrow.length; _i6++) {
          var ft = map_config.layout_features.arrow[_i6];
          var _arrow = new UserArrow(ft.id, ft.pt1, ft.pt2, svg_map, true);
          _arrow.hide_head = map_config.layout_features.arrow[_i6].marker_head === null;
          _arrow.arrow.select('line').attr('marker-end', map_config.layout_features.arrow[_i6].marker_head);
        }
      }
      if (map_config.layout_features.user_ellipse) {
        for (var _i7 = 0; _i7 < map_config.layout_features.user_ellipse.length; _i7++) {
          var _ft2 = map_config.layout_features.user_ellipse[_i7];
          var ellps = new UserEllipse(_ft2.id, [_ft2.cx, _ft2.cy], svg_map, true);
          var ellps_node = ellps.ellipse.node().querySelector('ellipse');
          ellps_node.setAttribute('rx', _ft2.rx);
          ellps_node.setAttribute('ry', _ft2.ry);
          ellps_node.style.stroke = _ft2.stroke;
          ellps_node.style.strokeWidth = _ft2.stroke_width;
        }
      }
      if (map_config.layout_features.user_rectangle) {
        for (var _i8 = 0; _i8 < map_config.layout_features.user_rectangle.length; _i8++) {
          var _ft3 = map_config.layout_features.user_rectangle[_i8],
              rect = new UserRectangle(_ft3.id, [_ft3.x, _ft3.y], svg_map, true),
              rect_node = rect.rectangle.node().querySelector('rect');
          rect_node.setAttribute('height', _ft3.height);
          rect_node.setAttribute('width', _ft3.width);
          rect_node.setAttribute('style', _ft3.style);
        }
      }
      if (map_config.layout_features.text_annot) {
        for (var _i9 = 0; _i9 < map_config.layout_features.text_annot.length; _i9++) {
          var _ft4 = map_config.layout_features.text_annot[_i9];
          var new_txt_box = new Textbox(svg_map, _ft4.id, [_ft4.position_x, _ft4.position_y]);
          new_txt_box.textAnnot.node().setAttribute('style', _ft4.style);
          new_txt_box.textAnnot.attrs({
            transform: _ft4.transform,
            x: _ft4.position_x,
            y: _ft4.position_y
          }).selectAll('tspan').attrs({
            x: _ft4.position_x,
            y: _ft4.position_y
          });
          new_txt_box.fontSize = +_ft4.style.split('font-size: ')[1].split('px')[0];
          new_txt_box.fontFamily = _ft4.style.split('font-family: ')[1].split(';')[0];
          new_txt_box.update_text(_ft4.content);
        }
      }
      if (map_config.layout_features.single_symbol) {
        for (var _i10 = 0; _i10 < map_config.layout_features.single_symbol.length; _i10++) {
          var _ft5 = map_config.layout_features.single_symbol[_i10];
          var symb = add_single_symbol(_ft5.href, _ft5.x, _ft5.y, _ft5.width, _ft5.height, _ft5.id);
          if (_ft5.scalable) {
            var parent_symb = symb.node().parentElement;
            parent_symb.classList.add('scalable-legend');
            parent_symb.setAttribute('transform', ['translate(', map_config.zoom_translate[0], ',', map_config.zoom_translate[1], ') scale(', map_config.zoom_scale, ',', map_config.zoom_scale, ')'].join(''));
          }
        }
      }
    }
  }
  var at_end = [];
  var done = 0;
  var func_name_corresp = new Map([['Links', 'flow'], ['Carto_doug', 'cartogram'], ['OlsonCarto', 'cartogram'], ['Stewart', 'smooth'], ['Gridded', 'grid'], ['DiscLayer', 'discont'], ['Choropleth', 'choro'], ['Categorical', 'typo']]);

  // Set the dimension of the map (width and height) :
  w = +map_config.div_width;
  h = +map_config.div_height;
  canvas_mod_size([w, h]);
  document.getElementById('input-width').value = w;
  document.getElementById('input-height').value = h;

  // Recrate the Map for the palettes defined by the user:
  _app.custom_palettes = new Map(map_config.custom_palettes);

  // Set the variables/fields related to the projection
  // (names were slightly changed in a last version, thus the replacing of whitespace)
  current_proj_name = map_config.projection.replace(/ /g, '');
  if (map_config.custom_projection) {
    proj = getD3ProjFromProj4(proj4(map_config.custom_projection));
    _app.last_projection = map_config.custom_projection;
  } else {
    proj = d3[available_projections.get(current_proj_name).name]();
  }
  if (map_config.projection_parallels) proj = proj.parallels(map_config.projection_parallels);
  if (map_config.projection_parallel) proj = proj.parallel(map_config.projection_parallel);
  if (map_config.projection_clipAngle) proj = proj.clipAngle(map_config.projection_clipAngle);
  s = map_config.projection_scale;
  t = map_config.projection_translate;
  proj.scale(s).translate(t).rotate(map_config.projection_rotation);
  defs = map.append('defs');
  path = d3.geoPath().projection(proj).pointRadius(4);
  map.selectAll('.layer').selectAll('path').attr('d', path);
  addLastProjectionSelect(current_proj_name);
  // Set the background color of the map :
  console.log(map_config.background_color);
  map.style('background-color', map_config.background_color);
  document.querySelector('input#bg_color').value = rgb2hex(map_config.background_color);

  // Reload the external (not-joined) dataset if there is one :
  if (map_config.joined_dataset) {
    field_join_map = [];
    joined_dataset = [map_config.joined_dataset.slice()];
    dataset_name = map_config.dataset_name;
    update_menu_dataset();
  }

  // Add each layer :

  var _loop = function _loop(_i11) {
    var _layer = layers[_i11];
    var layer_name = _layer.layer_name,
        layer_type = _layer.layer_type,
        layer_id = void 0,
        symbol = void 0;

    // Reload the sphere differently as some ("breaking") changes were made
    // when updating to 0.3.3
    if (app_version === undefined || p_version.major === 0 && p_version.minor <= 3 && p_version.patch < 3) {
      if (layer_name === 'Sphere') {
        layer_type = 'sphere';
      } else if (layer_name === 'Graticule') {
        layer_type = 'graticule';
      }
    }
    var fill_opacity = _layer.fill_opacity,
        stroke_opacity = _layer.stroke_opacity;

    // This is a layer for which a geometries have been stocked as TopoJSON :
    if (_layer.topo_geom) {
      var tmp = {
        skip_alert: true,
        choosed_name: layer_name,
        skip_rescale: true
      };
      if (_layer.targeted) {
        tmp.target_layer_on_add = true;
      } else if (_layer.renderer) {
        tmp.func_name = func_name_corresp.get(_layer.renderer);
        tmp.result_layer_on_add = true;
      }
      if (_layer.pointRadius !== undefined) {
        tmp.pointRadius = _layer.pointRadius;
      }
      // handle_reload_TopoJSON(_layer.topo_geom, tmp).then(function(n_layer_name){
      layer_name = handle_reload_TopoJSON(_layer.topo_geom, tmp);
      var current_layer_prop = current_layers[layer_name];
      if (_layer.renderer) {
        current_layer_prop.renderer = _layer.renderer;
      }
      if (_layer.targeted && _layer.fields_type) {
        current_layer_prop.fields_type = _layer.fields_type;
        document.getElementById('btn_type_fields').removeAttribute('disabled');
      }
      layer_id = _app.layer_to_id.get(layer_name);
      var layer_selec = map.select('#' + layer_id);

      current_layer_prop.rendered_field = _layer.rendered_field;

      if (_layer.ref_layer_name) current_layer_prop.ref_layer_name = _layer.ref_layer_name;
      if (_layer.size) current_layer_prop.size = _layer.size;
      if (_layer.colors_breaks) current_layer_prop.colors_breaks = _layer.colors_breaks;
      if (_layer.options_disc) current_layer_prop.options_disc = _layer.options_disc;
      if (_layer.fill_color) current_layer_prop.fill_color = _layer.fill_color;
      if (_layer.color_palette) current_layer_prop.color_palette = _layer.color_palette;
      if (_layer.renderer) {
        if (['Choropleth', 'Stewart', 'Gridded'].indexOf(_layer.renderer) > -1) {
          layer_selec.selectAll('path').style(current_layer_prop.type === 'Line' ? 'stroke' : 'fill', function (d, j) {
            return _layer.color_by_id[j];
          });
        } else if (_layer.renderer === 'Links') {
          current_layer_prop.linksbyId = _layer.linksbyId;
          current_layer_prop.min_display = _layer.min_display;
          current_layer_prop.breaks = _layer.breaks;
          layer_selec.selectAll('path').styles(function (d, j) {
            return {
              display: +d.properties.fij > _layer.min_display ? null : 'none',
              stroke: _layer.fill_color.single,
              'stroke-width': current_layer_prop.linksbyId[j][2]
            };
          });
        } else if (_layer.renderer === 'DiscLayer') {
          current_layer_prop.min_display = _layer.min_display || 0;
          current_layer_prop.breaks = _layer.breaks;
          var lim = current_layer_prop.min_display !== 0 ? current_layer_prop.min_display * current_layers[layer_name].n_features : -1;
          layer_selec.selectAll('path').styles(function (d, j) {
            return {
              fill: 'none',
              stroke: _layer.fill_color.single,
              display: j <= lim ? null : 'none',
              'stroke-width': d.properties.prop_val
            };
          });
        } else if (_layer.renderer.startsWith('Categorical')) {
          render_categorical(layer_name, {
            colorByFeature: _layer.color_by_id,
            color_map: new Map(_layer.color_map),
            rendered_field: _layer.rendered_field,
            renderer: 'Categorical'
          });
        }
        if (_layer.legend) {
          rehandle_legend(layer_name, _layer.legend);
        }
      }
      if (_layer.stroke_color) {
        layer_selec.selectAll('path').style('stroke', _layer.stroke_color);
      }
      if (_layer['stroke-width-const']) {
        current_layer_prop['stroke-width-const'] = _layer['stroke-width-const'];
        layer_selec.style('stroke-width', _layer['stroke-width-const']);
      }
      if (_layer.fixed_stroke) {
        current_layer_prop.fixed_stroke = _layer.fixed_stroke;
      }
      if (_layer.fill_color && _layer.fill_color.single && _layer.renderer !== 'DiscLayer') {
        layer_selec.selectAll('path').style(current_layer_prop.type !== 'Line' ? 'fill' : 'stroke', _layer.fill_color.single);
      } else if (_layer.fill_color && _layer.fill_color.random) {
        layer_selec.selectAll('path').style(current_layer_prop.type !== 'Line' ? 'fill' : 'stroke', function () {
          return Colors.names[Colors.random()];
        });
      }

      layer_selec.selectAll('path').styles({ 'fill-opacity': fill_opacity, 'stroke-opacity': stroke_opacity });
      if (_layer.visible === 'hidden') {
        handle_active_layer(layer_name);
      }
      if (_layer.filter_shadow) {
        createDropShadow(layer_id);
      }
      done += 1;
      if (done === map_config.n_layers) set_final_param();
      // });
    } else if (layer_name === 'World') {
      add_simplified_land_layer({
        skip_rescale: true,
        fill: _layer.fill_color,
        stroke: _layer.stroke_color,
        fill_opacity: fill_opacity,
        stroke_opacity: stroke_opacity,
        stroke_width: _layer['stroke-width-const'] + 'px',
        visible: _layer.visible !== 'hidden',
        drop_shadow: _layer.filter_shadow
      });
      done += 1;
      if (done === map_config.n_layers) set_final_param();
      // ... or this is a layer provided by the application :
    } else {
      if (layer_type === 'sphere' || layer_type === 'graticule') {
        var options = {
          layer_name: layer_name,
          stroke: _layer.stroke_color,
          fill_opacity: fill_opacity,
          stroke_opacity: stroke_opacity,
          stroke_width: _layer['stroke-width-const'] + 'px'
        };
        if (layer_type === 'graticule') {
          options.fill = 'none';
          options.stroke_dasharray = _layer.stroke_dasharray;
          options.step = _layer.step;
        } else {
          options.fill = _layer.fill_color;
        }
        add_layout_feature(layer_type, options);
        layer_id = _app.layer_to_id.get(layer_name);
        // ... or this is a layer of proportionnals symbols :
      } else if (_layer.renderer && _layer.renderer.startsWith('PropSymbol')) {
        var geojson_layer = _layer.symbol === 'line' ? _layer.geo_line : _layer.geo_pt;
        var rendering_params = {
          new_name: layer_name,
          field: _layer.rendered_field,
          ref_value: _layer.size[0],
          ref_size: _layer.size[1],
          symbol: _layer.symbol,
          nb_features: geojson_layer.features.length,
          ref_layer_name: _layer.ref_layer_name,
          renderer: _layer.renderer
        };
        if (_layer.renderer === 'PropSymbolsChoro' || _layer.renderer === 'PropSymbolsTypo') {
          rendering_params.fill_color = _layer.fill_color.class;
        } else if (_layer.fill_color.random) {
          rendering_params.fill_color = '#fff';
        } else if (_layer.fill_color.single !== undefined) {
          rendering_params.fill_color = _layer.fill_color.single;
        } else if (_layer.fill_color.two) {
          rendering_params.fill_color = _layer.fill_color;
          rendering_params.break_val = _layer.break_val;
        }

        if (_layer.symbol === 'line') {
          make_prop_line(rendering_params, geojson_layer);
        } else {
          make_prop_symbols(rendering_params, geojson_layer);
          if (_layer.stroke_color) {
            map.select('#' + _app.layer_to_id.get(layer_name)).selectAll(_layer.symbol).style('stroke', _layer.stroke_color);
          }
        }
        if (_layer.renderer === 'PropSymbolsTypo') {
          current_layers[layer_name].color_map = new Map(_layer.color_map);
        }
        if (_layer.options_disc) {
          current_layers[layer_name].options_disc = _layer.options_disc;
        }
        if (_layer.rendered_field2) {
          current_layers[layer_name].rendered_field2 = _layer.rendered_field2;
        }
        if (_layer.colors_breaks) {
          current_layers[layer_name].colors_breaks = _layer.colors_breaks;
        }
        if (_layer.size_legend_symbol) {
          current_layers[layer_name].size_legend_symbol = _layer.size_legend_symbol;
        }
        if (_layer.legend) {
          rehandle_legend(layer_name, _layer.legend);
        }
        current_layers[layer_name]['stroke-width-const'] = _layer['stroke-width-const'];
        layer_id = _app.layer_to_id.get(layer_name);
        var _layer_selec = map.select('#' + layer_id).selectAll(_layer.symbol);
        _layer_selec.styles({
          'stroke-width': _layer['stroke-width-const'] + 'px',
          'fill-opacity': fill_opacity,
          'stroke-opacity': stroke_opacity
        });
        if (_layer.fill_color.random) {
          _layer_selec.style('fill', function (_) {
            return Colors.names[Colors.random()];
          });
        }
        if (_layer.current_position) {
          at_end.push([restorePreviousPos, layer_id, _layer.current_position, _layer.symbol]);
        }
        // ... or this is a layer of labels :
      } else if (_layer.renderer && _layer.renderer.startsWith('Label')) {
        var _rendering_params = {
          uo_layer_name: layer_name,
          label_field: _layer.rendered_field,
          color: _layer.fill_color,
          ref_font_size: _layer.default_size,
          font: _layer.default_font
        };
        // TODO : apply the same thing as with PropSymbol
        // for setting label at their original positions :
        render_label(null, _rendering_params, {
          data: _layer.data_labels,
          current_position: _layer.current_position
        });
        layer_id = _app.layer_to_id.get(layer_name);
      } else if (_layer.renderer && _layer.renderer === 'TwoStocksWaffle') {
        render_twostocks_waffle(undefined, {
          nCol: _layer.nCol,
          ratio: _layer.ratio,
          symbol_type: _layer.symbol,
          new_name: layer_name,
          size: _layer.size,
          ref_colors: _layer.fill_color,
          fields: _layer.rendered_field,
          result_data: _layer.result_data
        });
        layer_id = _app.layer_to_id.get(layer_name);
        map.select('#' + layer_id).selectAll(_layer.symbol).style('fill-opacity', _layer.fill_opacity);
        if (_layer.legend) {
          rehandle_legend(layer_name, _layer.legend);
        }
        if (_layer.current_position) {
          at_end.push([restorePreviousPosWaffle, layer_id, _layer.current_position, _layer.symbol]);
        }
      } else if (_layer.renderer && _layer.renderer.startsWith('TypoSymbol')) {
        var symbols_map = new Map(_layer.symbols_map);
        var new_layer_data = {
          type: 'FeatureCollection',
          features: _layer.current_state.map(function (d) {
            return d.data;
          })
        };

        var nb_features = new_layer_data.features.length;
        var context_menu = new ContextMenu();
        var getItems = function getItems(self_parent) {
          return [{ name: i18next.t('app_page.common.edit_style'), action: function action() {
              make_style_box_indiv_symbol(self_parent);
            } }, { name: i18next.t('app_page.common.delete'), action: function action() {
              self_parent.style.display = 'none';
            } }];
        };
        layer_id = encodeId(layer_name);
        _app.layer_to_id.set(layer_name, layer_id);
        _app.id_to_layer.set(layer_id, layer_name);
        // Add the features at there original positions :
        map.append('g').attrs({ id: layer_id, class: 'layer' }).selectAll('image').data(new_layer_data.features).enter().insert('image').attrs(function (d, j) {
          var symb = symbols_map.get(d.properties.symbol_field),
              prop = _layer.current_state[j],
              coords = prop.pos;
          return {
            x: coords[0] - symb[1] / 2,
            y: coords[1] - symb[1] / 2,
            width: prop.size,
            height: prop.size,
            'xlink:href': symb[0]
          };
        }).style('display', function (d, j) {
          return _layer.current_state[j].display;
        }).on('mouseover', function () {
          this.style.cursor = 'pointer';
        }).on('mouseout', function () {
          this.style.cursor = 'initial';
        }).on('contextmenu dblclick', function () {
          context_menu.showMenu(d3.event, document.querySelector('body'), getItems(this));
        }).call(drag_elem_geo);

        create_li_layer_elem(layer_name, nb_features, ['Point', 'symbol'], 'result');
        current_layers[layer_name] = {
          n_features: nb_features,
          renderer: 'TypoSymbols',
          symbols_map: symbols_map,
          rendered_field: _layer.rendered_field,
          is_result: true,
          symbol: 'image',
          ref_layer_name: _layer.ref_layer_name
        };
        if (_layer.legend) {
          rehandle_legend(layer_name, _layer.legend);
        }
      } else {
        null;
      }
      // Had the layer a shadow effect ?
      if (_layer.filter_shadow) {
        createDropShadow(layer_id);
      }
      // Was the layer visible when the project was saved :
      if (_layer.visible === 'hidden' && layer_name !== 'World') {
        handle_active_layer(layer_name);
      }
      // This function is called on each layer added
      //   to delay the call to the function doing a final
      //   adjusting of the zoom factor / translate values / layers orders :
      done += 1;
      if (done === map_config.n_layers) set_final_param();
    }
  };

  for (var _i11 = map_config.n_layers - 1; _i11 > -1; --_i11) {
    _loop(_i11);
  }
}
/* eslint-enable no-loop-func */

function reorder_layers(desired_order) {
  var layers = svg_map.querySelectorAll('.layer'),
      parent = layers[0].parentNode,
      nb_layers = desired_order.length;
  // eslint-disable-next-line no-param-reassign
  desired_order = desired_order.map(function (el) {
    return _app.layer_to_id.get(el);
  });
  for (var i = 0; i < nb_layers; i++) {
    if (document.getElementById(desired_order[i])) {
      parent.insertBefore(document.getElementById(desired_order[i]), parent.firstChild);
    }
  }
  svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
}

function reorder_elem_list_layer(desired_order) {
  var parent = document.getElementsByClassName('layer_list')[0],
      layers = parent.childNodes,
      nb_layers = desired_order.length;
  for (var i = 0; i < nb_layers; i++) {
    var selec = 'li.' + _app.layer_to_id.get(desired_order[i]);
    if (parent.querySelector(selec)) {
      parent.insertBefore(parent.querySelector(selec), parent.firstChild);
    }
  }
}

function reorder_layers_elem_legends(desired_order) {
  var elems = svg_map.querySelectorAll('.legend,.layer');
  var parent = elems[0].parentNode;
  var nb_elems = desired_order.length;
  for (var i = 0; i < nb_elems; i++) {
    var _t = svg_map.querySelector(desired_order[i]);
    if (_t) {
      parent.appendChild(_t);
    }
  }
  svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
}

function rehandle_legend(layer_name, properties) {
  for (var i = 0; i < properties.length; i++) {
    var prop = properties[i];
    if (prop.type === 'legend_root') {
      createLegend_choro(layer_name, prop.field, prop.title, prop.subtitle, prop.boxgap, prop.rect_fill_value, prop.rounding_precision, prop.no_data_txt, prop.bottom_note);
    } else if (prop.type === 'legend_root_symbol') {
      createLegend_symbol(layer_name, prop.field, prop.title, prop.subtitle, prop.nested_symbols, prop.rect_fill_value, prop.rounding_precision, prop.bottom_note);
    } else if (prop.type === 'legend_root_lines_class') {
      createLegend_discont_links(layer_name, prop.field, prop.title, prop.subtitle, prop.rect_fill_value, prop.rounding_precision, prop.bottom_note);
    } else if (prop.type === 'legend_root_lines_symbol') {
      createLegend_line_symbol(layer_name, prop.field, prop.title, prop.subtitle, prop.rect_fill_value, prop.rounding_precision, prop.bottom_note);
    } else if (prop.type === 'legend_root_waffle') {
      createLegend_waffle(layer_name, prop.field, prop.title, prop.subtitle, prop.rect_fill_value, prop.ratio_txt, prop.bottom_note);
    }
    var lgd = svg_map.querySelector('#' + prop.type + '.lgdf_' + _app.layer_to_id.get(layer_name));
    lgd.setAttribute('transform', prop.transform);
    if (prop.display === 'none') lgd.setAttribute('display', 'none');
  }
}

var serialize_layer_to_topojson = function serialize_layer_to_topojson(layer_name) {
  var layer = svg_map.querySelector('#' + _app.layer_to_id.get(layer_name)).querySelectorAll('path');
  var n_features = layer.length;
  var result_features = [];
  for (var i = 0; i < n_features; i++) {
    result_features.push(layer[i].__data__);
  }
  var to_convert = {};
  to_convert[layer_name] = { type: 'FeatureCollection', features: result_features };
  return Promise.resolve(JSON.stringify(topojson.topology(to_convert)));
};
'use strict';

var display_box_symbol_typo = function display_box_symbol_typo(layer, field, categories) {
  var fetch_symbol_categories = function fetch_symbol_categories() {
    var categ = document.getElementsByClassName('typo_class'),
        symbol_map = new Map();
    for (var i = 0; i < categ.length; i++) {
      var selec = categ[i].querySelector('.symbol_section'),
          new_name = categ[i].querySelector('.typo_name').value;
      if (selec.style.backgroundImage.length > 7) {
        var img = selec.style.backgroundImage.split('url(')[1].substring(1).slice(0, -2);
        var size = +categ[i].querySelector('#symbol_size').value;
        symbol_map.set(categ[i].__data__.name, [img, size, new_name, cats[i].nb_elem]);
      } else {
        symbol_map.set(categ[i].__data__.name, [null, 0, new_name, cats[i].nb_elem]);
      }
    }
    return symbol_map;
  };
  var nb_features = current_layers[layer].n_features,
      data_layer = user_data[layer],
      cats = [],
      res_symbols = window.default_symbols,
      default_d_url = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAACMCAYAAACuwEE+AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADVwAAA1cBPbpBvAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAATySURBVHic7dxNiFVlHIDxZ5z8yvKjMgOTFLI0IrQMSg2jIFpESYSbyCGICqKINu6Kdm1KihZtomgRURRI9EH0YQXWLqJFqG1KIsiKQog+MFu8M1R3mo//nXPO+75znh+czVy55/+eeZy59753LkiSJEmSpCGN5B6gQRuAbQNfOwkcAc4GPux8IhXtLuDUwPErsAP4Dbg132jzx4LcA3RgFFgMvAzcmXmW6vUhmIk1jgLPAg9lnKV6fQoG0mO2x4HHMs1Svb4FM2Ef8PQUt2kafbhgU63xPuAFYGGHs1Svz8EA3A68BiztaJbq9SGY0Rluvwl4C1jewSzV60Mws1njLuB9YHXLs1TPYP5xBfARsK7FWapnMP+1CfgYuKilWapnMJNdQIpmawuzVM9g/t+5wAfAzoZnqV4fgpnpWdJUVgDvArsbnKV6fQhmLmtcDLwCjDU0S/UMZmanAc8BDzYwS/UMZnZGgP24aWkwQfuApxq+z6r0YeFNr/F+4HnSr6re6UMwwz5Lms4dwKvAkhbuu2h9CKatNd5M2rQ8s6X7L5LBzM21pE3Lc1o8R1EMZu62kTYtz2/5PEUwmGZsJu0/bezgXFkZTHPWk6LZ0tH5sjCYZq0hbVru6PCcnepDMG08rZ7OSuAd4MaOz9uJPgSTY42nAweAPRnO3SqDac8i4EXg7kznb4XBtGsUeIa0BzUvGEz7Rki73E8yDz5eJffF7EIpa3yAebBpWcrFbFNJa9xLegdftZuWJV3MtpS2xt3AG1S6aVnaxWxDiWu8DniP9FFqVSnxYjat1DVeSdq0XJt7kIhSL2aTSl7jJaT9pwtzDzJbJV/MpnS9NRC1gRTNZbkHmY0+BFPDGs8DDgLbM88xoxou5lzVssZVpE3LG3IPMp1aLuZc1LTGZcDrwG25B5lKTRdzWLWtcRHwEumDqotT9cvUs/Qo6a8WJ6wauH2UyR9XthA4Y+BrS5j8WXjLSN/gf1vO5Afag+dcQPpj/+nOuQc4THpAXIw+BPPD+KEG1PbjWpkZjEIMRiEGoxCDUYjBKMRgFGIwCjEYhRiMQgxGIQajEINRiMEoxGAUYjAKMRiFGIxCDEYhBqMQg1GIwSjEYBRiMAoxGIUYjEIMRiEGoxCDUYjBKMRgFGIwCjEYhRiMQgxGIQajEINRiMEoxGAUYjAKMRiFGIxCDEYhBqMQg1GIwSjEYBRiMAoxGIUYjEIMRiEGoxCDUYjBKMRgFGIwCjEYhRiMQgxGIQajEINRiMEoZCT3AENaDewErgEuBtYDG4ClA//uFHAUOAIcBj4BDgI/djSnMloJ3AscAv4ixTDMcRL4FLgHWN7pCtSJZcDDwAmGj2Sq4wTwyPg5NA9sB47RfCiDxzFgR0drUkvGgD9oP5aJ43dgbycrU+N2kb6BXcUycfwJXN/B+tSgRcDXdB/LxPHN+AyqxBj5Ypk4xlpfZaVKfOHuqtwDAFfnHqBUJQazLvcAlDFDkUoM5rvcAwDf5h6gVCUG82buAShjBs3SKPA5+R7wfjY+gyqyGThO97F8D2zqYH1qweV0G81xYGsnK1Nr1gAHaD+Wt4G1Ha1JLRsBbiG9raHpUA6N33et7wvSDLYD+4GvGD6Sr4An8MW5odT8P2sjsAW4lPQg+SzSm6xWjN/+C/Az8BPwJfAF6dnX0c4nlSRJkiRJgr8BhBGnmRww0QYAAAAASUVORK5CYII=")';

  if (!categories) {
    categories = new Map();
    for (var i = 0; i < nb_features; ++i) {
      var value = data_layer[i][field];
      var ret_val = categories.get(value);
      if (ret_val) {
        categories.set(value, [ret_val[0] + 1, [i].concat(ret_val[1])]);
      } else {
        categories.set(value, [1, [i]]);
      }
    }
    categories.forEach(function (v, k) {
      cats.push({ name: k, new_name: k, nb_elem: v[0], img: default_d_url });
    });
  } else {
    categories.forEach(function (v, k) {
      cats.push({ name: k, new_name: v[2], nb_elem: v[3], img: 'url(' + v[0] + ')' });
    });
  }
  var nb_class = cats.length;

  var modal_box = make_dialog_container('symbol_box', i18next.t('app_page.symbol_typo_box.title', { layer: layer, nb_features: nb_features }), 'dialog');
  var newbox = d3.select('#symbol_box').select('.modal-body').styles({ 'overflow-y': 'scroll', 'max-height': window.innerHeight - 145 + 'px' });

  newbox.append('h3').html('');
  newbox.append('p').html(i18next.t('app_page.symbol_typo_box.field_categ', { field: field, nb_class: nb_class, nb_features: nb_features }));
  newbox.append('ul').style('padding', 'unset').attr('id', 'typo_categories').selectAll('li').data(cats).enter().append('li').styles({ margin: 'auto', 'list-style': 'none' }).attr('class', 'typo_class').attr('id', function (d, i) {
    return ['line', i].join('_');
  });

  newbox.selectAll('.typo_class').append('span').attrs({ class: 'three_dots' }).style('cursor', 'grab');

  newbox.selectAll('.typo_class').append('input').styles({ width: '100px', height: 'auto', display: 'inline-block', 'vertical-align': 'middle', 'margin-right': '7.5px' }).attrs(function (d) {
    return { class: 'typo_name', value: d.new_name, id: d.name };
  });

  newbox.selectAll('.typo_class').insert('p').attrs({ class: 'symbol_section', title: i18next.t('app_page.symbol_typo_box.title_click') }).style('background-image', function (d) {
    return d.img;
  }).styles({ width: '32px',
    height: '32px',
    margin: '0px 1px 0px 1px',
    'border-radius': '10%',
    border: '1px dashed blue',
    display: 'inline-block',
    'background-size': '32px 32px',
    'vertical-align': 'middle' }).on('click', function () {
    var _this = this;

    modal_box.hide();
    box_choice_symbol(res_symbols, '.dialog').then(function (confirmed) {
      modal_box.show();
      if (confirmed) {
        _this.style.backgroundImage = confirmed;
      }
    });
  });

  newbox.selectAll('.typo_class').insert('span').html(function (d) {
    return i18next.t('app_page.symbol_typo_box.count_feature', { nb_features: d.nb_elem });
  });

  newbox.selectAll('.typo_class').insert('input').attrs({ type: 'number', id: 'symbol_size', value: 50 }).styles({ width: '50px', display: 'inline-block' });

  newbox.selectAll('.typo_class').insert('span').style('display', 'inline-block').html(' px');

  new Sortable(document.getElementById('typo_categories'));

  var deferred = Promise.pending();
  var container = document.getElementById('symbol_box');
  var fn_cb = function fn_cb(evt) {
    helper_esc_key_twbs_cb(evt, _onclose);
  };

  var clean_up_box = function clean_up_box() {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };

  var _onclose = function _onclose() {
    deferred.resolve(false);
    clean_up_box();
  };

  container.querySelector('.btn_ok').onclick = function () {
    var symbol_map = fetch_symbol_categories();
    deferred.resolve([nb_class, symbol_map]);
    clean_up_box();
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  document.addEventListener('keydown', fn_cb);
  overlay_under_modal.display();
  return deferred.promise;
};

function box_choice_symbol(sample_symbols, parent_css_selector) {
  var modal_box = make_dialog_container('box_choice_symbol', i18next.t('app_page.box_choice_symbol.title'), 'dialog');
  overlay_under_modal.display();
  var container = document.getElementById('box_choice_symbol');
  var btn_ok = container.querySelector('.btn_ok');
  container.querySelector('.modal-dialog').classList.add('fitContent');
  btn_ok.disabled = 'disabled';
  var newbox = d3.select(container).select('.modal-body').style('width', '220px');
  newbox.append('p').html('<b>' + i18next.t('app_page.box_choice_symbol.select_symbol') + '</b>');

  var box_select = newbox.append('div').styles({ width: '190px', height: '100px', overflow: 'auto', border: '1.5px solid #1d588b' }).attr('id', 'symbols_select');

  box_select.selectAll('p').data(sample_symbols).enter().append('p').attrs(function (d) {
    return {
      id: 'p_' + d[0].replace('.png', ''),
      title: d[0]
    };
  }).styles(function (d) {
    return { width: '32px',
      height: '32px',
      margin: 'auto',
      display: 'inline-block',
      'background-size': '32px 32px',
      'background-image': 'url("' + d[1] + '")' };
  }).on('click', function () {
    box_select.selectAll('p').each(function () {
      this.style.border = '';
      this.style.padding = '0px';
    });
    this.style.padding = '-1px';
    this.style.border = '1px dashed red';
    btn_ok.disabled = false;
    newbox.select('#current_symb').style('background-image', this.style.backgroundImage);
  });

  newbox.append('p').attr('display', 'inline').html('<b>' + i18next.t('app_page.box_choice_symbol.upload_symbol') + '</b>');
  newbox.append('p').styles({ margin: 'auto', 'text-align': 'center' }).append('button').html(i18next.t('app_page.box_choice_symbol.browse')).on('click', function () {
    var input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', '.jpeg,.jpg,.svg,.png,.gif');
    input.onchange = function (event) {
      var file = event.target.files[0],
          file_name = file.name,
          reader = new FileReader();
      reader.onloadend = function () {
        var dataUrl_res = ['url("', reader.result, '")'].join('');
        btn_ok.disabled = false;
        newbox.select('#current_symb').style('background-image', dataUrl_res);
      };
      reader.readAsDataURL(file);
    };
    input.dispatchEvent(new MouseEvent('click'));
  });

  newbox.insert('p').style('text-align', 'center').html(i18next.t('app_page.box_choice_symbol.selected_symbol'));
  newbox.insert('div').style('text-align', 'center').append('p').attrs({ class: 'symbol_section', id: 'current_symb' }).styles({ width: '32px',
    height: '32px',
    display: 'inline-block',
    'border-radius': '10%',
    'background-size': '32px 32px',
    'vertical-align': 'middle',
    margin: 'auto',
    'background-image': "url('')"
  });

  var deferred = Promise.pending();
  var fn_cb = function fn_cb(evt) {
    helper_esc_key_twbs_cb(evt, _onclose);
  };
  var clean_up_box = function clean_up_box() {
    container.remove();
    if (parent_css_selector) {
      reOpenParent(parent_css_selector);
    } else {
      overlay_under_modal.hide();
    }
    document.removeEventListener('keydown', fn_cb);
  };

  container.querySelector('.btn_ok').onclick = function () {
    var res_url = newbox.select('#current_symb').style('background-image');
    deferred.resolve(res_url);
    clean_up_box();
  };

  var _onclose = function _onclose() {
    deferred.resolve(false);
    clean_up_box();
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  document.addEventListener('keydown', fn_cb);
  return deferred.promise;
}

function make_style_box_indiv_symbol(symbol_node) {
  var parent = symbol_node.parentElement;
  var type_obj = parent.classList.contains('layer') ? 'layer' : 'layout';
  var current_options = {
    size: +symbol_node.getAttribute('width').replace('px', ''),
    scalable: !!(type_obj === 'layout' && parent.classList.contains('scalable-legend'))
  };
  var ref_coords = {
    x: +symbol_node.getAttribute('x') + current_options.size / 2,
    y: +symbol_node.getAttribute('y') + current_options.size / 2
  };
  var ref_coords2 = cloneObj(ref_coords);
  var new_params = {};
  var self = this;
  make_confirm_dialog2('styleTextAnnotation', i18next.t('app_page.single_symbol_edit_box.title')).then(function (confirmed) {
    if (!confirmed) {
      symbol_node.setAttribute('width', current_options.size + 'px');
      symbol_node.setAttribute('height', current_options.size + 'px');
      symbol_node.setAttribute('x', ref_coords.x - current_options.size / 2);
      symbol_node.setAttribute('y', ref_coords.y - current_options.size / 2);
      if (current_options.scalable) {
        var zoom_scale = svg_map.__zoom;
        parent.setAttribute('transform', 'translate(' + zoom_scale.x + ',' + zoom_scale.y + ') scale(' + zoom_scale.k + ',' + zoom_scale.k + ')');
        if (!parent.classList.contains('scalable-legend')) {
          parent.classList.add('scalable-legend');
        }
      } else if (!parent.classList.contains('layer')) {
        parent.removeAttribute('transform', undefined);
        if (parent.classList.contains('scalable-legend')) {
          parent.classList.remove('scalable-legend');
        }
      }
    }
  });
  var box_content = d3.select('.styleTextAnnotation').select('.modal-body').insert('div');
  var a = box_content.append('p').attr('class', 'line_elem');
  a.append('span').html(i18next.t('app_page.single_symbol_edit_box.image_size'));
  a.append('input').style('float', 'right').attrs({ type: 'number', id: 'font_size', min: 0, max: 150, step: 'any', value: current_options.size }).on('change', function () {
    var val = +this.value;
    symbol_node.setAttribute('width', val + 'px');
    symbol_node.setAttribute('height', val + 'px');
    symbol_node.setAttribute('x', ref_coords2.x - val / 2);
    symbol_node.setAttribute('y', ref_coords2.y - val / 2);
  });

  if (type_obj === 'layout') {
    var current_state = parent.classList.contains('scalable-legend');
    var b = box_content.append('p').attr('class', 'line_elem');
    b.append('label').attrs({ for: 'checkbox_symbol_zoom_scale', class: 'i18n', 'data-i18n': '[html]app_page.single_symbol_edit_box.scale_on_zoom' }).html(i18next.t('app_page.single_symbol_edit_box.scale_on_zoom'));
    b.append('input').style('float', 'right').attrs({ type: 'checkbox', id: 'checkbox_symbol_zoom_scale' }).on('change', function () {
      var zoom_scale = svg_map.__zoom;
      if (this.checked) {
        symbol_node.setAttribute('x', (symbol_node.x.baseVal.value - zoom_scale.x) / zoom_scale.k);
        symbol_node.setAttribute('y', (symbol_node.y.baseVal.value - zoom_scale.y) / zoom_scale.k);
        parent.setAttribute('transform', 'translate(' + zoom_scale.x + ',' + zoom_scale.y + ') scale(' + zoom_scale.k + ',' + zoom_scale.k + ')');
        parent.classList.add('scalable-legend');
      } else {
        symbol_node.setAttribute('x', symbol_node.x.baseVal.value * zoom_scale.k + zoom_scale.x);
        symbol_node.setAttribute('y', symbol_node.y.baseVal.value * zoom_scale.k + zoom_scale.y);
        parent.removeAttribute('transform');
        parent.classList.remove('scalable-legend');
      }
      ref_coords2.x = +symbol_node.getAttribute('x');
      ref_coords2.y = +symbol_node.getAttribute('y');
    });
    document.getElementById('checkbox_symbol_zoom_scale').checked = current_options.scalable;
  }
}
'use strict';

var shortListContent = ['AzimuthalEqualAreaEurope', 'ConicConformalFrance', 'HEALPix', 'Mercator', 'NaturalEarth2', 'Robinson', 'TransverseMercator', 'WinkelTriple', 'more', 'proj4'];

var available_projections = new Map([['Armadillo', { name: 'geoArmadillo', scale: '400', param_in: 'other', param_ex: 'aphylactic' }], ['AzimuthalEquidistant', { name: 'geoAzimuthalEquidistant', scale: '700', param_in: 'plan', param_ex: 'equidistant' }], ['AzimuthalEqualArea', { name: 'geoAzimuthalEqualArea', scale: '700', param_in: 'plan', param_ex: 'equalarea' }], ['AzimuthalEqualAreaEurope', { name: 'geoAzimuthalEqualArea', scale: '700', rotate: [-10, -52, 0], bounds: [-10.6700, 34.5000, 31.5500, 71.0500], param_in: 'plan', param_ex: 'equalarea' }], ['Baker', { name: 'geoBaker', scale: '400', param_in: 'other', param_ex: 'aphylactic' }], ['Berhmann', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 30, param_in: 'cylindrical', param_ex: 'equalarea' }], ['Boggs', { name: 'geoBoggs', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['InterruptedBoggs', { name: 'geoInterruptedBoggs', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Bonne', { name: 'geoBonne', scale: '400', param_in: 'pseudocone', param_ex: 'equalarea' }], ['Bromley', { name: 'geoBromley', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Collignon', { name: 'geoCollignon', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
// ["ConicConformalTangent", {'name': 'geoConicConformal', 'scale': '400', 'parallels': [44, 44], bounds: [-25.5, -25.5, 75.5, 75.5], param_in: 'cone', param_ex: 'conformal'}],
['ConicConformal', { name: 'geoConicConformal', scale: '400', parallels: [44, 49], bounds: [-25.5, -25.5, 75.5, 75.5], param_in: 'cone', param_ex: 'conformal' }], ['ConicConformalFrance', { name: 'geoConicConformal', scale: '400', parallels: [44, 49], rotate: [-3, -46.5, 0], bounds: [-10.6700, 34.5000, 31.5500, 71.0500], param_in: 'cone', param_ex: 'conformal' }], ['ConicEqualArea', { name: 'geoConicEqualArea', scale: '400', param_in: 'cone', param_ex: 'equalarea' }], ['ConicEquidistant', { name: 'geoConicEquidistant', scale: '400', parallels: [40, 45], param_in: 'cone', param_ex: 'equidistant' }],
// ["ConicEquidistantTangent", {'name': 'geoConicEquidistant', 'scale': '400', parallels: [40, 40], param_in: 'cone', param_ex: 'equidistant'}],
['CrasterParabolic', { name: 'geoCraster', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Equirectangular', { name: 'geoEquirectangular', scale: '400', param_in: 'cylindrical', param_ex: 'equidistant' }], ['CylindricalEqualArea', { name: 'geoCylindricalEqualArea', scale: '400', param_in: 'cylindrical', param_ex: 'equalarea' }], ['CylindricalStereographic', { name: 'geoCylindricalStereographic', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }], ['EckertI', { name: 'geoEckert1', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['EckertII', { name: 'geoEckert2', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['EckertIII', { name: 'geoEckert3', scale: '525', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['EckertIV', { name: 'geoEckert4', scale: '525', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['EckertV', { name: 'geoEckert5', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['EckertVI', { name: 'geoEckert6', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Eisenlohr', { name: 'geoEisenlohr', scale: '400', param_in: 'other', param_ex: 'conformal' }], ['GallPeters', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 45, param_in: 'cylindrical', param_ex: 'equalarea' }], ['GallStereographic', { name: 'geoCylindricalStereographic', scale: '400', parallel: 45, param_in: 'cylindrical', param_ex: 'aphylactic' }], ['Gilbert', { name: 'geoGilbert', scale: '400', type: '', param_in: 'other', param_ex: 'aphylactic' }], ['Gnomonic', { name: 'geoGnomonic', scale: '400', param_in: 'plan', param_ex: 'aphylactic' }], ['Gringorten', { name: 'geoGringorten', scale: '400', param_in: 'other', param_ex: 'equalarea' }], ['GringortenQuincuncial', { name: 'geoGringortenQuincuncial', scale: '400', param_in: 'other', param_ex: 'equalarea' }], ['Hatano', { name: 'geoHatano', scale: '200', param_in: 'other', param_ex: 'equalarea' }], ['HEALPix', { name: 'geoHealpix', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['HoboDyer', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 37.5, param_in: 'cylindrical', param_ex: 'equalarea' }], ['Homolosine', { name: 'geoHomolosine', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['InterruptedHomolosine', { name: 'geoInterruptedHomolosine', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Loximuthal', { name: 'geoLoximuthal', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['Mercator', { name: 'geoMercator', scale: '375', param_in: 'cylindrical', param_ex: 'conformal' }], ['Miller', { name: 'geoMiller', scale: '375', param_in: 'cylindrical', param_ex: 'aphylactic' }], ['MillerOblatedStereographic', { name: 'geoModifiedStereographicMiller', scale: '375', param_in: 'plan', param_ex: 'conformal' }], ['Mollweide', { name: 'geoMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['NaturalEarth', { name: 'geoNaturalEarth', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['NaturalEarth2', { name: 'geoNaturalEarth2', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['Orthographic', { name: 'geoOrthographic', scale: '475', clipAngle: 90, param_in: 'plan', param_ex: 'aphylactic' }], ['Patterson', { name: 'geoPatterson', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }], ['Polyconic', { name: 'geoPolyconic', scale: '400', param_in: 'pseudocone', param_ex: 'aphylactic' }], ['Peircequincuncial', { name: 'geoPeirceQuincuncial', scale: '400', param_in: 'other', param_ex: 'conformal' }], ['Robinson', { name: 'geoRobinson', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['SinuMollweide', { name: 'geoSinuMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['InterruptedSinuMollweide', { name: 'geoInterruptedSinuMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Sinusoidal', { name: 'geoSinusoidal', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['InterruptedSinusoidal', { name: 'geoInterruptedSinusoidal', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }], ['Stereographic', { name: 'geoStereographic', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }], ['TransverseMercator', { name: 'geoTransverseMercator', scale: '400', param_in: 'cylindrical', param_ex: 'conformal' }], ['Werner', { name: 'geoBonne', scale: '400', parallel: 90, param_in: 'pseudocone', param_ex: 'equalarea' }], ['Winkel1', { name: 'geoWinkel1', scale: '200', param_in: 'pseudocylindre', param_ex: 'aphylactic' }], ['WinkelTriple', { name: 'geoWinkel3', scale: '400', param_in: 'pseudoplan', param_ex: 'aphylactic' }]]);

var createBoxProj4 = function createBoxProj4() {
  make_dialog_container('box_projection_input', i18next.t('app_page.section5.title'), 'dialog');
  var container = document.getElementById('box_projection_input');
  var dialog = container.querySelector('.modal-dialog');

  var content = d3.select(container).select('.modal-body').attr('id', 'box_proj4');

  dialog.style.width = undefined;
  dialog.style.maxWidth = '500px';
  dialog.style.minWidth = '400px';

  var input_section = content.append('p');
  input_section.append('span').style('float', 'left').html(i18next.t('app_page.proj4_box.enter_string'));
  input_section.append('input').styles({ width: '90%' }).attrs({
    id: 'input_proj_string',
    placeholder: '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs'
  });

  var fn_cb = function fn_cb(evt) {
    helper_esc_key_twbs_cb(evt, clean_up_box);
  };
  var clean_up_box = function clean_up_box() {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };
  var _onclose_valid = function _onclose_valid() {
    var proj_str = document.getElementById('input_proj_string').value.trim();
    var _p = void 0;
    if (proj_str.startsWith('"') || proj_str.startsWith("'")) {
      proj_str = proj_str.substr(1);
    }
    if (proj_str.endsWith('"') || proj_str.endsWith("'")) {
      proj_str = proj_str.slice(0, -1);
    }
    clean_up_box();
    try {
      _p = proj4(proj_str);
    } catch (e) {
      swal({
        title: 'Oops...',
        text: i18next.t('app_page.proj4_box.error', { detail: e }),
        type: 'error',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(function () {
        return null;
      }, function () {
        return null;
      });
      return;
    }
    var rv = change_projection_4(_p);
    if (rv) {
      _app.last_projection = proj_str;
      addLastProjectionSelect('def_proj4', _app.last_projection);
      current_proj_name = 'def_proj4';
    } else {
      swal({
        title: 'Oops...',
        text: i18next.t('app_page.proj4_box.error', { detail: '' }),
        type: 'error',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(function () {
        return null;
      }, function () {
        return null;
      });
    }
  };
  container.querySelector('.btn_cancel').onclick = clean_up_box;
  container.querySelector('#xclose').onclick = clean_up_box;
  container.querySelector('.btn_ok').onclick = _onclose_valid;
  document.addEventListener('keydown', fn_cb);
  overlay_under_modal.display();
};

var displayTooltipProj4 = function displayTooltipProj4(ev) {
  var target = ev.target;
  if (!(target && target.tagName === 'SELECT' && target.value === 'last_projection')) {
    return;
  }
  var title = target.tooltip;
  var tooltipWrap = document.createElement('div');
  tooltipWrap.className = 'custom_tooltip';
  tooltipWrap.appendChild(document.createTextNode(title));

  var firstChild = document.body.firstChild;
  firstChild.parentNode.insertBefore(tooltipWrap, firstChild);

  var linkProps = this.getBoundingClientRect();
  var tooltipProps = tooltipWrap.getBoundingClientRect();
  var topPos = linkProps.bottom - tooltipProps.height / 2;
  tooltipWrap.setAttribute('style', 'top: ' + topPos + 'px; left: ' + (linkProps.right - 15) + 'px;');
};

var removeTooltipProj4 = function removeTooltipProj4(ev) {
  var target = ev.target;
  if (!(target && target.tagName === 'SELECT' && target.value === 'last_projection')) {
    return;
  }
  var a = document.querySelector('div.custom_tooltip');
  if (a) a.remove();
};

var makeTooltipProj4 = function makeTooltipProj4(proj_select, proj4string) {
  proj_select.tooltip = proj4string; // eslint-disable-line no-param-reassign
  proj_select.addEventListener('mouseover', displayTooltipProj4);
  proj_select.addEventListener('mouseout', removeTooltipProj4);
};

function addLastProjectionSelect(proj_name, proj4string) {
  var proj_select = document.getElementById('form_projection2');
  if (shortListContent.indexOf(proj_name) > -1) {
    proj_select.value = proj_name;
  } else if (proj_select.options.length === 10) {
    var prev_elem = proj_select.querySelector("[value='more']"),
        new_option = document.createElement('option');
    new_option.className = 'i18n';
    new_option.value = 'last_projection';
    new_option.name = proj_name;
    new_option.setAttribute('data-i18n', '[text]app_page.projection_name.' + proj_name);
    new_option.innerHTML = i18next.t('app_page.projection_name.' + proj_name);
    proj_select.insertBefore(new_option, prev_elem);
    proj_select.value = 'last_projection';
    if (proj4string) {
      makeTooltipProj4(proj_select, proj4string);
    }
  } else {
    var option = proj_select.querySelector("[value='last_projection']");
    option.name = proj_name;
    option.innerHTML = i18next.t('app_page.projection_name.' + proj_name);
    option.setAttribute('data-i18n', '[text]app_page.projection_name.' + proj_name);
    proj_select.value = 'last_projection';
    if (proj4string) {
      makeTooltipProj4(proj_select, proj4string);
    }
  }
}

var createBoxCustomProjection = function createBoxCustomProjection() {
  function updateSelect(filter_in, filter_ex) {
    display_select_proj.remove();
    display_select_proj = p.append('select').attr('id', 'select_proj').attr('size', 18);
    if (!filter_in && !filter_ex) {
      // for (const proj_name of available_projections.keys()) { .. }
      Array.from(available_projections.keys()).forEach(function (proj_name) {
        display_select_proj.append('option').attrs({ class: 'i18n', value: proj_name, 'data-i18n': 'app_page.projection_name.' + proj_name }).text(i18next.t('app_page.projection_name.' + proj_name));
      });
    } else if (!filter_ex) {
      available_projections.forEach(function (v, k) {
        if (v.param_in === filter_in) {
          display_select_proj.insert('option').attrs({ class: 'i18n', value: k }).text(i18next.t('app_page.projection_name.' + k));
        }
      });
    } else if (!filter_in) {
      available_projections.forEach(function (v, k) {
        if (v.param_ex === filter_ex) {
          display_select_proj.append('option').attrs({ class: 'i18n', value: k }).text(i18next.t('app_page.projection_name.' + k));
        }
      });
    } else {
      var empty = true;
      available_projections.forEach(function (v, k) {
        if (v.param_in === filter_in && v.param_ex === filter_ex) {
          empty = false;
          display_select_proj.append('option').attrs({ class: 'i18n', value: k }).text(i18next.t('app_page.projection_name.' + k));
        }
      });
      if (empty) {
        display_select_proj.append('option').attrs({ class: 'i18n', value: 'no_result' }).html(i18next.t('app_page.projection_box.no_result_projection'));
      }
    }
    display_select_proj.on('dblclick', function () {
      if (this.value === 'no_result') return;
      reproj(this.value);
    });
  }
  function onClickFilter() {
    var filter1_val = Array.prototype.filter.call(document.querySelector('.switch-field.f1').querySelectorAll('input'), function (f) {
      return f.checked;
    })[0];
    filter1_val = filter1_val === undefined ? undefined : filter1_val.value;
    if (filter1_val === 'any') filter1_val = undefined;
    var filter2_val = Array.prototype.filter.call(document.querySelector('.switch-field.f2').querySelectorAll('input'), function (f) {
      return f.checked;
    })[0];
    filter2_val = filter2_val === undefined ? undefined : filter2_val.value;
    if (filter2_val === 'any') filter2_val = undefined;
    updateSelect(filter1_val, filter2_val);
  }
  function updateProjOptions() {
    if (proj.rotate) {
      rotate_section.style('display', '');
      var param_rotate = proj.rotate();
      lambda_input.node().value = -param_rotate[0];
      phi_input.node().value = -param_rotate[1];
      gamma_input.node().value = -param_rotate[2];
    } else {
      rotate_section.style('display', 'none');
    }
    if (proj.parallels) {
      var param_parallels = proj.parallels();
      parallels_section.style('display', '');
      parallel_section.style('display', 'none');
      sp1_input.node().value = param_parallels[0];
      sp2_input.node().value = param_parallels[1];
    } else if (proj.parallel) {
      parallels_section.style('display', 'none');
      parallel_section.style('display', '');
      sp_input.node().value = proj.parallel();
    } else {
      parallels_section.style('display', 'none');
      parallel_section.style('display', 'none');
    }
  }

  function reproj(value) {
    current_proj_name = value;
    addLastProjectionSelect(current_proj_name);
    change_projection(current_proj_name);
    updateProjOptions();
  }

  var prev_projection = current_proj_name,
      prev_translate = [].concat(t),
      prev_scale = s,
      prev_rotate = proj.rotate ? proj.rotate() : undefined,
      prev_parallels = proj.parallels ? proj.parallels() : undefined,
      prev_parallel = proj.parallel ? proj.parallel() : undefined;

  var modal_box = make_dialog_container('box_projection_customization', i18next.t('app_page.section5.title'), 'dialog');
  var container = document.getElementById('box_projection_customization'),
      dialog = container.querySelector('.modal-dialog');

  var content = d3.select(container).select('.modal-body').attr('id', 'box_projection');

  dialog.style.width = '700px';

  var choice_proj = content.append('button').attrs({ class: 'accordion_proj active', id: 'btn_choice_proj' }).style('padding', '0 6px').html(i18next.t('app_page.projection_box.choice_projection'));
  var accordion_choice_projs = content.append('div').attrs({ class: 'panel show', id: 'accordion_choice_projection' }).style('padding', '10px').style('width', '98%');
  var choice_proj_content = accordion_choice_projs.append('div').attr('id', 'choice_proj_content').style('text-align', 'center');

  var column1 = choice_proj_content.append('div').styles({ float: 'left', width: '50%' });
  var column3 = choice_proj_content.append('div').styles({ float: 'right', width: '45%' });
  var column2 = choice_proj_content.append('div').styles({ float: 'left', width: '50%' });
  choice_proj_content.append('div').style('clear', 'both');

  var filtersection1 = column1.append('div').attr('class', 'switch-field f1');
  filtersection1.append('div').attrs({ class: 'switch-title' }).html(i18next.t('app_page.projection_box.filter_nature'));
  ['any', 'other', 'cone', 'cylindrical', 'plan', 'pseudocone', 'pseudocylindre', 'pseudoplan'].forEach(function (v, i) {
    var _id = 'switch_proj1_elem_' + i;
    filtersection1.append('input').attrs({ type: 'radio', id: _id, class: 'filter1', name: 'switch_proj1', value: v });
    filtersection1.append('label').attr('for', _id).html(i18next.t('app_page.projection_box.' + v));
  });

  var filtersection2 = column2.append('div').attr('class', 'switch-field f2');
  filtersection2.append('div').attrs({ class: 'switch-title' }).html(i18next.t('app_page.projection_box.filter_prop'));
  ['any', 'aphylactic', 'conformal', 'equalarea', 'equidistant'].forEach(function (v, i) {
    var _id = 'switch_proj2_elem_' + i;
    filtersection2.append('input').attrs({ type: 'radio', id: _id, class: 'filter2', name: 'switch_proj2', value: v });
    filtersection2.append('label').attr('for', _id).html(i18next.t('app_page.projection_box.' + v));
  });

  Array.prototype.forEach.call(document.querySelectorAll('.filter1,.filter2'), function (el) {
    el.onclick = onClickFilter;
  }); // eslint-disable-line no-param-reassign

  var p = column3.append('p').style('margin', 'auto');
  var display_select_proj = p.append('select').attr('id', 'select_proj').attr('size', 18);

  updateSelect(null, null);

  column3.append('button').style('margin', '5px 0 5px 0').attrs({ id: 'btn_valid_reproj', class: 'button_st4 i18n' }).html(i18next.t('app_page.projection_box.ok_reproject')).on('click', function () {
    var value = document.getElementById('select_proj').value;
    if (value === 'no_result') return;
    reproj(value);
  });

  var choice_options = content.append('button').attrs({ class: 'accordion_proj', id: 'btn_choice_proj' }).style('padding', '0 6px').html(i18next.t('app_page.projection_box.projection_options'));
  var accordion_choice_options = content.append('div').attrs({ class: 'panel', id: 'accordion_choice_projection' }).style('padding', '10px').style('width', '98%');
  var options_proj_content = accordion_choice_options.append('div').attr('id', 'options_proj_content').style('width', '60%').style('transform', 'translateX(45%)');

  var rotate_section = options_proj_content.append('div').style('display', prev_rotate ? '' : 'none');
  var lambda_section = rotate_section.append('p');
  lambda_section.append('span').style('float', 'left').html(i18next.t('app_page.section5.projection_center_lambda'));
  var lambda_input = lambda_section.append('input').styles({ width: '60px', float: 'right' }).attrs({ type: 'number', value: prev_rotate ? -prev_rotate[0] : 0, min: -180, max: 180, step: 0.50 }).on('input', function () {
    if (this.value > 180) this.value = 180;else if (this.value < -180) this.value = -180;
    handle_proj_center_button([-this.value, null, null]);
  });

  var phi_section = rotate_section.append('p').style('clear', 'both');
  phi_section.append('span').style('float', 'left').html(i18next.t('app_page.section5.projection_center_phi'));
  var phi_input = phi_section.append('input').styles({ width: '60px', float: 'right' }).attrs({ type: 'number', value: prev_rotate ? -prev_rotate[1] : 0, min: -180, max: 180, step: 0.5 }).on('input', function () {
    if (this.value > 180) {
      this.value = 180;
    } else if (this.value < -180) {
      this.value = -180;
    }
    handle_proj_center_button([null, -this.value, null]);
  });

  var gamma_section = rotate_section.append('p').style('clear', 'both');
  gamma_section.append('span').style('float', 'left').html(i18next.t('app_page.section5.projection_center_gamma'));
  var gamma_input = gamma_section.append('input').styles({ width: '60px', float: 'right' }).attrs({ type: 'number', value: prev_rotate ? -prev_rotate[2] : 0, min: -90, max: 90, step: 0.5 }).on('input', function () {
    if (this.value > 90) {
      this.value = 90;
    } else if (this.value < -90) {
      this.value = -90;
    }
    handle_proj_center_button([null, null, -this.value]);
  });

  var parallels_section = options_proj_content.append('div').styles({ 'text-align': 'center', clear: 'both' }).style('display', prev_parallels ? '' : 'none');
  parallels_section.append('span').html(i18next.t('app_page.section5.parallels'));
  var inputs = parallels_section.append('p').styles({ 'text-align': 'center', margin: 'auto' });
  var sp1_input = inputs.append('input').styles({ width: '60px', display: 'inline', 'margin-right': '2px' }).attrs({ type: 'number', value: prev_parallels ? prev_parallels[0] : 0, min: -90, max: 90, step: 0.5 }).on('input', function () {
    if (this.value > 90) this.value = 90;else if (this.value < -90) this.value = -90;
    handle_parallels_change([this.value, null]);
  });
  var sp2_input = inputs.append('input').styles({ width: '60px', display: 'inline', 'margin-left': '2px' }).attrs({ type: 'number', value: prev_parallels ? prev_parallels[1] : 0, min: -90, max: 90, step: 0.5 }).on('input', function () {
    if (this.value > 90) this.value = 90;else if (this.value < -90) this.value = -90;
    handle_parallels_change([null, this.value]);
  });

  var parallel_section = options_proj_content.append('div').styles({ 'text-align': 'center', clear: 'both' }).style('display', prev_parallel ? '' : 'none');
  parallel_section.append('span').html(i18next.t('app_page.section5.parallel'));

  var sp_input = parallel_section.append('p').styles({ 'text-align': 'center', margin: 'auto' }).append('input').styles({ width: '60px', display: 'inline', 'margin-right': '2px' }).attrs({ type: 'number', value: prev_parallel || 0, min: -90, max: 90, step: 0.5 }).on('input', function () {
    if (this.value > 90) this.value = 90;else if (this.value < -90) this.value = -90;
    handle_parallel_change(this.value);
  });

  if (prev_projection === 'def_proj4') {
    options_proj_content.selectAll('input').attr('disabled', 'disabled');
    options_proj_content.selectAll('span').styles({ color: 'darkgrey', 'font-style': 'italic' });
  }

  accordionize2('.accordion_proj', container);
  var clean_up_box = function clean_up_box() {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };
  var fn_cb = function fn_cb(evt) {
    helper_esc_key_twbs_cb(evt, _onclose_cancel);
  };
  var _onclose_cancel = function _onclose_cancel() {
    clean_up_box();
    s = prev_scale;
    t = prev_translate.slice();
    current_proj_name = prev_projection;

    if (prev_projection !== 'def_proj4') {
      change_projection(current_proj_name);
      addLastProjectionSelect(current_proj_name);
    } else if (prev_projection === 'def_proj4') {
      change_projection_4(proj4(_app.last_projection));
      addLastProjectionSelect(current_proj_name, _app.last_projection);
    }
    if (prev_rotate) {
      handle_proj_center_button(prev_rotate);
    }
    if (prev_parallels) {
      handle_parallels_change(prev_parallels);
    } else if (prev_parallel) {
      handle_parallel_change(prev_parallel);
    }
  };
  container.querySelector('.btn_cancel').onclick = _onclose_cancel;
  container.querySelector('#xclose').onclick = _onclose_cancel;
  container.querySelector('.btn_ok').onclick = clean_up_box;
  document.addEventListener('keydown', fn_cb);
  overlay_under_modal.display();
};

/**
* Function to change (one of more of) the three rotations axis of a d3 projection
* and redraw all the path (+ move symbols layers) in respect to that.
*
* @param {Array} param - The new [lambda, phi, gamma] properties to be used.
* @return {void}
*/
function handle_proj_center_button(param) {
  // Fetch the current rotation params :
  var current_rotation = proj.rotate();
  // Reuse it for the missing value passed in arguments and do the rotation:
  // proj.rotate(param.map((val, i) => val !== null ? val : current_rotation[i]));
  proj.rotate(param.map(function (val, i) {
    return val || current_rotation[i];
  }));
  // Redraw the path and move the symbols :
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
}

function handle_parallels_change(parallels) {
  var current_values = proj.parallels();
  proj.parallels(parallels.map(function (val, i) {
    return val || current_values[i];
  }));
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
}

function handle_parallel_change(parallel) {
  proj.parallel(parallel);
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
}

// const getD3ProjFromProj4 = function getD3ProjFromProj4(_proj) {
//   // Create the custom d3 projection using proj 4 forward and inverse functions:
//   const projRaw = function (lambda, phi) {
//     return _proj.forward([lambda, phi].map(radiansToDegrees));
//   };
//   projRaw.invert = function (x, y) {
//     return _proj.inverse([x, y]).map(degreesToRadians);
//   };
//   return d3.geoProjection(projRaw);
// };
// const pidegrad = 0.017453292519943295;
// const piraddeg = 57.29577951308232;
// const degreesToRadians = function degreesToRadians(degrees) { return degrees * pidegrad; };
// const radiansToDegrees = function radiansToDegrees(radians) { return radians * piraddeg; };

/**
* Return a d3.geoProjection from a proj4 projection.
* (code below should avoid some function calls compared to the previous commented
* section but achieve exactly the same job).
*
* @param {Object} _proj - The valid proj4 object returned by proj4.
* @return {Object} - The projection as a d3.geoProjection.
*
*/
var getD3ProjFromProj4 = function getD3ProjFromProj4(_proj) {
  // Create the custom d3 projection using proj 4 forward and inverse functions:
  var projRaw = function projRaw(lambda, phi) {
    return _proj.forward([lambda * 57.29577951308232, phi * 57.29577951308232]);
  };
  projRaw.invert = function (x, y) {
    var p = _proj.inverse([x, y]);
    return [p[0] * 0.017453292519943295, p[1] * 0.017453292519943295];
  };
  return d3.geoProjection(projRaw);
};
'use strict';

var sin = Math.sin;
var asin = Math.asin;
var abs = Math.abs;
var cos = Math.cos;

var NITER = 20;
var EPS = 1e-7;
var ONETOL = 1.000001;
var CN = 2.67595;
var CS = 2.43763;
var RCN = 0.37369906014686373063;
var RCS = 0.41023453108141924738;
var FYCN = 1.75859;
var FYCS = 1.93052;
var RYCN = 0.56863737426006061674;
var RYCS = 0.51799515156538134803;
var FXC = 0.85;
var RXC = 1.17647058823529411764;
var M_HALFPI = Math.PI / 2;

function hatanoRaw(lambda, phi) {
  var c = sin(phi) * (phi < 0 ? CS : CN);
  var y = phi;
  var th1 = void 0;
  var i = void 0;
  for (i = NITER; i; --i) {
    y -= th1 = (y + sin(y) - c) / (1 + cos(y));
    if (abs(th1) < EPS) break;
  }
  return [FXC * lambda * cos(y *= 0.5), sin(y) * (y < 0 ? FYCS : FYCN)];
}

hatanoRaw.invert = function (x, y) {
  var xx = x;
  var yy = y;
  var th = yy * (yy < 0 ? RYCS : RYCN);
  if (abs(th) > 1) {
    if (abs(th) > ONETOL) {
      console.log('Error');
      return [NaN, NaN];
    }
    th = th > 0 ? M_HALFPI : -M_HALFPI;
  } else {
    th = asin(th);
  }
  xx = RXC * xx / cos(th);
  th += th;
  yy = (th + sin(th)) * (yy < 0 ? RCS : RCN);
  if (abs(yy) > 1) {
    if (abs(yy) > ONETOL) {
      console.log('Error');
      return [NaN, NaN];
    }
    yy = yy > 0 ? M_HALFPI : -M_HALFPI;
  } else {
    yy = asin(yy);
  }
  return [xx, yy];
};

function winkel1Raw(latTrueScale) {
  var cosphi1 = cos(latTrueScale);

  function forward(lambda, phi) {
    var x = lambda;
    var y = phi;
    return [0.5 * x * (cosphi1 + cos(phi)), y];
  }

  forward.invert = function (x, y) {
    var lambda = x;
    var phi = y;
    return [2 * lambda / (cosphi1 + cos(phi)), phi];
  };

  return forward;
}

d3.geoWinkel1 = function () {
  return d3.geoProjection(winkel1Raw(45)).scale(200);
};

d3.geoHatano = function () {
  return d3.geoProjection(hatanoRaw).scale(200);
};
'use strict';

/**
* Return a basic operator as a function, each one taking two numbers in arguments
*
* @param {String} operator
* @return {function}
*/
function get_fun_operator(operator) {
  var operators = new Map([['+', function (a, b) {
    return a + b;
  }], ['-', function (a, b) {
    return a - b;
  }], ['/', function (a, b) {
    if (b === 0) {
      return '';
    }return a / b;
  }], ['*', function (a, b) {
    return a * b;
  }], ['^', function (a, b) {
    return Math.pow(a, b);
  }]]);
  return operators.get(operator);
}

/**
* Function to add a field to the targeted layer
*
* @param {Array} table - A reference to the "table" to work on
* @param {String} layer - The name of the layer
* @param {Object} parent - A reference to the parent box in order to redisplay the table according to the changes
*
*/
function add_field_table(table, layer_name, parent) {
  function check_name() {
    if (regexp_name.test(this.value) || this.value === '') {
      chooses_handler.new_name = this.value;
    } else {
      // Rollback to the last correct name  :
      this.value = chooses_handler.new_name;
      swal({ title: i18next.t('Error') + '!',
        text: i18next.t('Unauthorized character!'),
        type: 'error',
        allowOutsideClick: false });
    }
  }

  function compute_and_add() {
    var options = chooses_handler,
        fi1 = options.field1,
        fi2 = options.field2,
        new_name_field = options.new_name,
        operation = options.operator;
    var opt_val = options.opt_val;

    if (!regexp_name.test(new_name_field)) {
      swal({ title: '',
        text: i18next.t('app_page.explore_box.add_field_box.invalid_name'),
        type: 'error',
        allowOutsideClick: false });
      return Promise.reject('Invalid name');
    }
    if (options.type_operation === 'math_compute' && table.length > 3200) {
      var formToSend = new FormData();
      var var1 = [],
          var2 = fi2 === 'user_const_value' ? +opt_val : [];
      for (var i = 0; i < table.length; i++) {
        var1.push(+table[i][fi1]);
      }
      if (fi2 !== 'user_const_value') {
        for (var _i = 0; _i < table.length; _i++) {
          var2.push(+table[_i][fi2]);
        }
      }
      formToSend.append('var1', JSON.stringify(var1));
      formToSend.append('var2', JSON.stringify(var2));
      formToSend.append('operator', operation);
      return xhrequest('POST', '/helpers/calc', formToSend, false).then(function (data) {
        var parsed_result = JSON.parse(data);
        for (var _i2 = 0; _i2 < table.length; _i2++) {
          table[_i2][new_name_field] = parsed_result[_i2];
        }
        return true;
      });
    } else if (options.type_operation === 'math_compute') {
      var math_func = get_fun_operator(operation);
      if (fi2 !== 'user_const_value') {
        for (var _i3 = 0; _i3 < table.length; _i3++) {
          if (table[_i3][fi1] != null && table[_i3][fi1] != '' && table[_i3][fi2] != null && table[_i3][fi2] != '') {
            table[_i3][new_name_field] = math_func(+table[_i3][fi1], +table[_i3][fi2]);
          } else {
            table[_i3][new_name_field] = '';
          }
        }
      } else {
        opt_val = +opt_val;
        for (var _i4 = 0; _i4 < table.length; _i4++) {
          if (table[_i4][fi1] != null && table[_i4][fi1] != '') {
            table[_i4][new_name_field] = math_func(+table[_i4][fi1], opt_val);
          } else {
            table[_i4][new_name_field] = '';
          }
        }
      }
      return Promise.resolve(true);
    } else if (operation === 'truncate') {
      opt_val = +opt_val;
      if (opt_val >= 0) {
        for (var _i5 = 0; _i5 < table.length; _i5++) {
          table[_i5][new_name_field] = table[_i5][fi1].substring(0, opt_val);
        }
      } else {
        for (var _i6 = 0; _i6 < table.length; _i6++) {
          table[_i6][new_name_field] = table[_i6][fi1].substr(opt_val);
        }
      }
      return Promise.resolve(true);
    } else if (operation === 'concatenate') {
      for (var _i7 = 0; _i7 < table.length; _i7++) {
        table[_i7][new_name_field] = [table[_i7][fi1], table[_i7][fi2]].join(opt_val);
      }
      return Promise.resolve(true);
    }

    return Promise.reject('Unknown error');
  }

  function refresh_type_content(type) {
    field1.node().remove();operator.node().remove();field2.node().remove();
    field1 = div1.append('select').on('change', function () {
      chooses_handler.field1 = this.value;
    });
    operator = div1.append('select').on('change', function () {
      chooses_handler.operator = this.value;
      refresh_subtype_content(chooses_handler.type_operation, this.value);
    });
    field2 = div1.append('select').on('change', function () {
      chooses_handler.field2 = this.value;
      if (this.value === 'user_const_value') {
        val_opt.style('display', null);
      }
    });
    if (type === 'math_compute') {
      math_operation.forEach(function (op) {
        operator.append('option').text(op).attr('value', op);
      });
      // for (const k in fields_type) {
      var _f = Object.getOwnPropertyNames(fields_type);
      for (var i = 0, n = _f.length; i < n; i++) {
        var k = _f[i];
        if (fields_type[k] === 'number') {
          field1.append('option').text(k).attr('value', k);
          field2.append('option').text(k).attr('value', k);
        }
      }
      field2.append('option').attr('value', 'user_const_value').text(i18next.t('app_page.explore_box.add_field_box.constant_value'));
      val_opt.style('display', 'none');
      txt_op.text('');
      chooses_handler.operator = math_operation[0];
    } else {
      string_operation.forEach(function (op) {
        operator.append('option').text(op[0]).attr('value', op[1]);
      });
      // for (const k in fields_type) {
      var _f2 = Object.getOwnPropertyNames(fields_type);
      for (var _i8 = 0, _n = _f2.length; _i8 < _n; _i8++) {
        var _k = _f2[_i8];
        if (fields_type[_k] === 'string') {
          field1.append('option').text(_k).attr('value', _k);
          field2.append('option').text(_k).attr('value', _k);
        }
      }
      val_opt.style('display', null);
      txt_op.html(i18next.t('app_page.explore_box.add_field_box.join_char'));
      chooses_handler.operator = string_operation[0];
    }
    chooses_handler.field1 = field1.node().value;
    chooses_handler.field2 = field2.node().value;
  }

  function refresh_subtype_content(type, subtype) {
    if (type !== 'string_field') {
      if (field2.node().value !== 'user_const_value') {
        val_opt.style('display', 'none');
        txt_op.text('');
      }
    } else if (subtype === 'truncate') {
      txt_op.html(i18next.t('app_page.explore_box.add_field_box.keep_char'));
      field2.attr('disabled', true);
    } else {
      txt_op.html(i18next.t('app_page.explore_box.add_field_box.join_char'));
      field2.attr('disabled', null);
    }
  }

  var math_operation = ['+', '-', '*', '/', '^'];

  var string_operation = [[i18next.t('app_page.explore_box.add_field_box.concatenate'), 'concatenate'], [i18next.t('app_page.explore_box.add_field_box.truncate'), 'truncate']];

  var chooses_handler = {
    field1: undefined,
    field2: undefined,
    operator: undefined,
    type_operation: undefined,
    opt_val: undefined,
    new_name: i18next.t('app_page.explore_box.add_field_box.new_name_placeholder')
  };

  make_confirm_dialog2('addFieldBox', i18next.t('app_page.explore_box.button_add_field'), { width: w > 430 ? 430 : undefined, height: h > 280 ? 280 : undefined }).then(function (valid) {
    reOpenParent('#browse_data_box');
    if (valid) {
      document.querySelector('body').style.cursor = 'wait';
      compute_and_add(chooses_handler).then(function (resolved) {
        if (current_layers[layer_name].targeted) {
          current_layers[layer_name].fields_type.push(type_col2(user_data[layer_name], chooses_handler.new_name)[0]);
          if (window.fields_handler) {
            fields_handler.unfill();
            fields_handler.fill(layer_name);
          }
        }
        if (parent) {
          parent.modal_box.show();
          parent.display_table(layer_name);
        }
      }, function (error) {
        if (error !== 'Invalid name') {
          display_error_during_computation();
        }
        console.log(error);
        document.querySelector('body').style.cursor = '';
      }).done(function () {
        document.querySelector('body').style.cursor = '';
      });
    }
  });

  var current_fields = Object.getOwnPropertyNames(table),
      fields_type = type_col(layer_name),
      regexp_name = new RegExp(/^[a-z0-9_]+$/i),
      // Only allow letters (lower & upper cases), number and underscore in the field name
  container = document.querySelector('.twbs > .addFieldBox'),
      box_content = d3.select(container).select('.modal-body').append('div'),
      div1 = box_content.append('div').attr('id', 'field_div1'),
      div2 = box_content.append('div').attr('id', 'field_div2');

  var new_name = div1.append('p').html(i18next.t('app_page.explore_box.add_field_box.new_name')).insert('input').attr('value', i18next.t('app_page.explore_box.add_field_box.new_name_placeholder')).on('keyup', check_name);

  var type_content = div1.append('p').html(i18next.t('app_page.explore_box.add_field_box.new_content')).insert('select').attr('id', 'type_content_select').on('change', function () {
    chooses_handler.type_operation = this.value;
    refresh_type_content(this.value);
  });

  [[i18next.t('app_page.explore_box.add_field_box.between_numerical'), 'math_compute'], [i18next.t('app_page.explore_box.add_field_box.between_string'), 'string_field']].forEach(function (d, i) {
    type_content.append('option').text(d[0]).attr('value', d[1]);
  });

  var field1 = div1.append('select').on('change', function () {
    chooses_handler.field1 = this.value;
  });
  var operator = div1.append('select').on('change', function () {
    chooses_handler.operator = this.value;
    refresh_subtype_content(chooses_handler.type_operation, this.value);
  });
  var field2 = div1.append('select').on('change', function () {
    chooses_handler.field2 = this.value;
  });

  var txt_op = div2.append('p').attr('id', 'txt_opt').text('');
  var val_opt = div2.append('input').attr('id', 'val_opt').style('display', 'none').on('change', function () {
    chooses_handler.opt_val = this.value;
  });

  {
    var a = type_content.node();
    var b = false;
    var _f = Object.getOwnPropertyNames(fields_type);
    for (var i = 0, n = _f.length; i < n; i++) {
      var fi = _f[i];
      if (fields_type[fi] === 'number') {
        b = true;
        break;
      }
    }
    a.value = b ? 'math_compute' : 'string_field';
    a.dispatchEvent(new Event('change'));
  }
}

function createTableDOM(data, opts) {
  var options = opts || {};
  options.id = options.id || 'myTable';
  var doc = document,
      nb_features = data.length,
      column_names = Object.getOwnPropertyNames(data[0]),
      nb_columns = column_names.length;
  var myTable = doc.createElement('table'),
      headers = doc.createElement('thead'),
      body = doc.createElement('tbody'),
      headers_row = doc.createElement('tr');
  for (var i = 0; i < nb_columns; i++) {
    var cell = doc.createElement('th');
    cell.innerHTML = column_names[i];
    headers_row.appendChild(cell);
  }
  headers.appendChild(headers_row);
  myTable.appendChild(headers);
  for (var _i9 = 0; _i9 < nb_features; _i9++) {
    var row = doc.createElement('tr');
    for (var j = 0; j < nb_columns; j++) {
      var _cell = doc.createElement('td');
      _cell.innerHTML = data[_i9][column_names[j]];
      row.appendChild(_cell);
    }
    body.appendChild(row);
  }
  myTable.appendChild(body);
  myTable.setAttribute('id', options.id);
  return myTable;
}

function make_table(layer_name) {
  var features = svg_map.querySelector('#' + _app.layer_to_id.get(layer_name)).childNodes;
  var table = [];
  if (!features[0].__data__.properties || Object.getOwnPropertyNames(features[0].__data__.properties).length === 0) {
    for (var i = 0, nb_ft = features.length; i < nb_ft; i++) {
      table.push({ id: features[i].__data__.id || i });
    }
  } else {
    for (var _i10 = 0, _nb_ft = features.length; _i10 < _nb_ft; _i10++) {
      table.push(features[_i10].__data__.properties);
    }
  }
  return table;
}

var boxExplore2 = {
  display_table: function display_table(table_name) {
    var _this = this;

    document.querySelector('body').style.cursor = '';
    var the_table = this.tables.get(table_name);
    the_table = the_table ? the_table[1] : make_table(table_name);

    this.nb_features = the_table.length;
    this.columns_names = Object.getOwnPropertyNames(the_table[0]);
    this.columns_headers = [];
    for (var i = 0, col = this.columns_names, len = col.length; i < len; ++i) {
      this.columns_headers.push({ data: col[i], title: col[i] });
    }
    if (this.top_buttons.select('#add_field_button').node()) {
      this.top_buttons.select('#add_field_button').remove();
      document.getElementById('table_intro').remove();
      document.querySelector('.dataTable-wrapper').remove();
    }

    if (this.tables.get(table_name) && (table_name !== dataset_name || table_name === dataset_name && field_join_map.length === 0)) {
      this.top_buttons.insert('button').attrs({ id: 'add_field_button', class: 'button_st3' }).html(i18next.t('app_page.explore_box.button_add_field')).on('click', function () {
        _this.modal_box.hide();
        add_field_table(the_table, table_name, _this);
      });
    }
    var txt_intro = ['<b>', table_name, '</b><br>', this.nb_features, ' ', i18next.t('app_page.common.feature', { count: this.nb_features }), ' - ', this.columns_names.length, ' ', i18next.t('app_page.common.field', { count: this.columns_names.length })].join('');
    this.box_table.append('p').attr('id', 'table_intro').style('margin', '10px 0 !important').html(txt_intro);
    this.box_table.node().appendChild(createTableDOM(the_table, { id: 'myTable' }));
    var list_per_page_select = [5, 10, 15, 20, 25];
    if (this.nb_features > 25) {
      list_per_page_select.push(this.nb_features);
    }
    var myTable = document.getElementById('myTable');
    this.datatable = new DataTable(myTable, {
      sortable: true,
      searchable: true,
      perPageSelect: list_per_page_select,
      labels: {
        placeholder: i18next.t('app_page.table.search'), // The search input placeholder
        perPage: i18next.t('app_page.table.entries_page'), // per-page dropdown label
        noRows: i18next.t('app_page.table.no_rows'), // Message shown when there are no search results
        info: i18next.t('app_page.table.info') }
    });
    // Adjust the size of the box (on opening and after adding a new field)
    // and/or display scrollbar if its overflowing the size of the window minus a little margin :
    setTimeout(function () {
      var box = document.getElementById('browse_data_box');
      // box.querySelector(".dataTable-pagination").style.width = "80%";
      var bbox = box.querySelector('#myTable').getBoundingClientRect(),
          new_width = bbox.width,
          new_height = bbox.height + box.querySelector('.dataTable-pagination').getBoundingClientRect().height;

      if (new_width > window.innerWidth * 0.85) {
        box.querySelector('.modal-content').style.overflow = 'auto';
        box.querySelector('.modal-dialog').style.width = window.innerWidth * 0.9 + 'px';
      } else if (new_width > 560) {
        box.querySelector('.modal-dialog').style.width = new_width + 80 + 'px';
      }
      box.style.left = new_width > window.innerWidth * 0.85 ? '5px' : +box.style.left.replace('px', '') / 2 + 'px';
      // if (new_height > 350 || new_height > window.innerHeight * 0.80) {

      var modal_body = box.querySelector('.modal-body');
      modal_body.style.padding = '12.5px 15px 15px 15px';
      if (new_height > 350 || new_height > window.innerHeight * 0.80) {
        modal_body.style.height = Math.min(new_height + 115, window.innerHeight - 125) + 'px';
      }
      modal_body.style.overflow = 'auto';
      // }
    }, 250);
    setSelected(document.querySelector('.dataTable-selector'), '10');
  },
  get_available_tables: function get_available_tables() {
    var target_layer = Object.getOwnPropertyNames(user_data),
        ext_dataset = dataset_name,
        result_layers = Object.getOwnPropertyNames(result_data),
        available = new Map();
    for (var i = 0, n = target_layer.length; i < n; i++) {
      var lyr_name = target_layer[i];
      available.set(lyr_name, [i18next.t('app_page.common.target_layer'), user_data[lyr_name]]);
    }
    if (ext_dataset) {
      available.set(dataset_name, [i18next.t('app_page.common.ext_dataset'), joined_dataset[0]]);
    }
    for (var _i11 = 0, _n2 = result_layers.length; _i11 < _n2; _i11++) {
      var _lyr_name = result_layers[_i11];
      available.set(_lyr_name, [i18next.t('app_page.common.result_layer'), result_data[_lyr_name]]);
    }
    return available;
  },
  create: function create(layer_name) {
    this.columns_headers = [];
    this.nb_features = undefined;
    this.columns_names = undefined;
    this.tables = this.get_available_tables();
    this.modal_box = make_dialog_container('browse_data_box', i18next.t('app_page.explore_box.title'), 'discretiz_charts_dialog');
    var container = document.getElementById('browse_data_box');
    this.box_table = d3.select(container).select('.modal-body');
    this.top_buttons = this.box_table.append('p').styles({ 'margin-left': '15px', display: 'inline', 'font-size': '12px' });

    var fn_cb = function fn_cb(evt) {
      helper_esc_key_twbs_cb(evt, _onclose);
    };
    var _onclose = function _onclose() {
      container.remove();
      overlay_under_modal.hide();
      document.removeEventListener('keydown', fn_cb);
    };
    container.querySelector('.btn_cancel').onclick = _onclose;
    container.querySelector('#xclose').onclick = _onclose;
    container.querySelector('.btn_ok').onclick = _onclose;
    document.addEventListener('keydown', fn_cb);
    overlay_under_modal.display();
    this.display_table(layer_name);
  }
};
"use strict";

var world_topology = { "type": "Topology", "objects": { "World": { "type": "GeometryCollection", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "geometries": [{ "type": "Polygon", "properties": { "id": "1" }, "arcs": [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]] }, { "type": "Polygon", "properties": { "id": "2" }, "arcs": [[10]] }, { "type": "Polygon", "properties": { "id": "3" }, "arcs": [[11]] }, { "type": "Polygon", "properties": { "id": "4" }, "arcs": [[12]] }, { "type": "Polygon", "properties": { "id": "5" }, "arcs": [[13]] }, { "type": "Polygon", "properties": { "id": "6" }, "arcs": [[14]] }, { "type": "Polygon", "properties": { "id": "7" }, "arcs": [[15]] }, { "type": "Polygon", "properties": { "id": "8" }, "arcs": [[16]] }, { "type": "Polygon", "properties": { "id": "9" }, "arcs": [[17]] }, { "type": "Polygon", "properties": { "id": "10" }, "arcs": [[18]] }, { "type": "Polygon", "properties": { "id": "11" }, "arcs": [[19]] }, { "type": "Polygon", "properties": { "id": "12" }, "arcs": [[20]] }, { "type": "Polygon", "properties": { "id": "13" }, "arcs": [[21]] }, { "type": "Polygon", "properties": { "id": "14" }, "arcs": [[22]] }, { "type": "Polygon", "properties": { "id": "15" }, "arcs": [[23]] }, { "type": "Polygon", "properties": { "id": "16" }, "arcs": [[24]] }, { "type": "Polygon", "properties": { "id": "17" }, "arcs": [[25]] }, { "type": "Polygon", "properties": { "id": "18" }, "arcs": [[26]] }, { "type": "Polygon", "properties": { "id": "19" }, "arcs": [[27]] }, { "type": "Polygon", "properties": { "id": "20" }, "arcs": [[28]] }, { "type": "Polygon", "properties": { "id": "21" }, "arcs": [[29]] }, { "type": "Polygon", "properties": { "id": "22" }, "arcs": [[30]] }, { "type": "Polygon", "properties": { "id": "23" }, "arcs": [[31]] }, { "type": "Polygon", "properties": { "id": "24" }, "arcs": [[32]] }, { "type": "Polygon", "properties": { "id": "25" }, "arcs": [[33]] }, { "type": "Polygon", "properties": { "id": "26" }, "arcs": [[34]] }, { "type": "Polygon", "properties": { "id": "27" }, "arcs": [[35]] }, { "type": "Polygon", "properties": { "id": "28" }, "arcs": [[36]] }, { "type": "Polygon", "properties": { "id": "29" }, "arcs": [[37]] }, { "type": "Polygon", "properties": { "id": "30" }, "arcs": [[38]] }, { "type": "Polygon", "properties": { "id": "31" }, "arcs": [[39]] }, { "type": "Polygon", "properties": { "id": "32" }, "arcs": [[40]] }, { "type": "Polygon", "properties": { "id": "33" }, "arcs": [[41]] }, { "type": "Polygon", "properties": { "id": "34" }, "arcs": [[42]] }, { "type": "Polygon", "properties": { "id": "35" }, "arcs": [[43]] }, { "type": "Polygon", "properties": { "id": "36" }, "arcs": [[44]] }, { "type": "Polygon", "properties": { "id": "37" }, "arcs": [[45]] }, { "type": "Polygon", "properties": { "id": "38" }, "arcs": [[46]] }, { "type": "Polygon", "properties": { "id": "39" }, "arcs": [[47]] }, { "type": "Polygon", "properties": { "id": "40" }, "arcs": [[48]] }, { "type": "Polygon", "properties": { "id": "41" }, "arcs": [[49], [50], [51], [52], [53], [54]] }, { "type": "Polygon", "properties": { "id": "42" }, "arcs": [[55]] }, { "type": "Polygon", "properties": { "id": "43" }, "arcs": [[56]] }, { "type": "Polygon", "properties": { "id": "44" }, "arcs": [[57]] }, { "type": "Polygon", "properties": { "id": "45" }, "arcs": [[58]] }, { "type": "Polygon", "properties": { "id": "46" }, "arcs": [[59]] }, { "type": "Polygon", "properties": { "id": "47" }, "arcs": [[60]] }, { "type": "Polygon", "properties": { "id": "48" }, "arcs": [[61]] }, { "type": "Polygon", "properties": { "id": "49" }, "arcs": [[62]] }, { "type": "Polygon", "properties": { "id": "50" }, "arcs": [[63]] }, { "type": "Polygon", "properties": { "id": "51" }, "arcs": [[64]] }, { "type": "Polygon", "properties": { "id": "52" }, "arcs": [[65]] }, { "type": "Polygon", "properties": { "id": "53" }, "arcs": [[66]] }, { "type": "Polygon", "properties": { "id": "54" }, "arcs": [[67]] }, { "type": "Polygon", "properties": { "id": "55" }, "arcs": [[68]] }, { "type": "Polygon", "properties": { "id": "56" }, "arcs": [[69]] }, { "type": "Polygon", "properties": { "id": "57" }, "arcs": [[70]] }, { "type": "Polygon", "properties": { "id": "58" }, "arcs": [[71]] }, { "type": "Polygon", "properties": { "id": "59" }, "arcs": [[72]] }, { "type": "Polygon", "properties": { "id": "60" }, "arcs": [[73]] }, { "type": "Polygon", "properties": { "id": "61" }, "arcs": [[74]] }, { "type": "Polygon", "properties": { "id": "62" }, "arcs": [[75]] }, { "type": "Polygon", "properties": { "id": "63" }, "arcs": [[76]] }, { "type": "Polygon", "properties": { "id": "64" }, "arcs": [[77]] }, { "type": "Polygon", "properties": { "id": "65" }, "arcs": [[78]] }, { "type": "Polygon", "properties": { "id": "66" }, "arcs": [[79]] }, { "type": "Polygon", "properties": { "id": "67" }, "arcs": [[80]] }, { "type": "Polygon", "properties": { "id": "68" }, "arcs": [[81]] }, { "type": "Polygon", "properties": { "id": "69" }, "arcs": [[82]] }, { "type": "Polygon", "properties": { "id": "70" }, "arcs": [[83]] }, { "type": "Polygon", "properties": { "id": "71" }, "arcs": [[84]] }, { "type": "Polygon", "properties": { "id": "72" }, "arcs": [[85]] }, { "type": "Polygon", "properties": { "id": "73" }, "arcs": [[86]] }, { "type": "Polygon", "properties": { "id": "74" }, "arcs": [[87]] }, { "type": "Polygon", "properties": { "id": "75" }, "arcs": [[88]] }, { "type": "Polygon", "properties": { "id": "76" }, "arcs": [[89]] }, { "type": "Polygon", "properties": { "id": "77" }, "arcs": [[90]] }, { "type": "Polygon", "properties": { "id": "78" }, "arcs": [[91]] }, { "type": "Polygon", "properties": { "id": "79" }, "arcs": [[92]] }, { "type": "Polygon", "properties": { "id": "80" }, "arcs": [[93]] }, { "type": "Polygon", "properties": { "id": "81" }, "arcs": [[94]] }, { "type": "Polygon", "properties": { "id": "82" }, "arcs": [[95]] }, { "type": "Polygon", "properties": { "id": "83" }, "arcs": [[96]] }, { "type": "Polygon", "properties": { "id": "84" }, "arcs": [[97]] }, { "type": "Polygon", "properties": { "id": "85" }, "arcs": [[98]] }, { "type": "Polygon", "properties": { "id": "86" }, "arcs": [[99]] }, { "type": "Polygon", "properties": { "id": "87" }, "arcs": [[100]] }, { "type": "Polygon", "properties": { "id": "88" }, "arcs": [[101]] }, { "type": "Polygon", "properties": { "id": "89" }, "arcs": [[102]] }, { "type": "Polygon", "properties": { "id": "90" }, "arcs": [[103]] }, { "type": "Polygon", "properties": { "id": "91" }, "arcs": [[104]] }, { "type": "Polygon", "properties": { "id": "92" }, "arcs": [[105]] }, { "type": "Polygon", "properties": { "id": "93" }, "arcs": [[106]] }, { "type": "Polygon", "properties": { "id": "94" }, "arcs": [[107]] }, { "type": "Polygon", "properties": { "id": "95" }, "arcs": [[108]] }, { "type": "Polygon", "properties": { "id": "96" }, "arcs": [[109]] }, { "type": "Polygon", "properties": { "id": "97" }, "arcs": [[110]] }, { "type": "Polygon", "properties": { "id": "98" }, "arcs": [[111]] }, { "type": "Polygon", "properties": { "id": "99" }, "arcs": [[112]] }, { "type": "Polygon", "properties": { "id": "100" }, "arcs": [[113]] }, { "type": "Polygon", "properties": { "id": "101" }, "arcs": [[114]] }, { "type": "Polygon", "properties": { "id": "102" }, "arcs": [[115]] }, { "type": "Polygon", "properties": { "id": "103" }, "arcs": [[116]] }, { "type": "Polygon", "properties": { "id": "104" }, "arcs": [[117]] }, { "type": "Polygon", "properties": { "id": "105" }, "arcs": [[118]] }, { "type": "Polygon", "properties": { "id": "106" }, "arcs": [[119]] }, { "type": "Polygon", "properties": { "id": "107" }, "arcs": [[120]] }, { "type": "Polygon", "properties": { "id": "108" }, "arcs": [[121]] }, { "type": "Polygon", "properties": { "id": "109" }, "arcs": [[122]] }, { "type": "Polygon", "properties": { "id": "110" }, "arcs": [[123]] }, { "type": "Polygon", "properties": { "id": "111" }, "arcs": [[124]] }, { "type": "Polygon", "properties": { "id": "112" }, "arcs": [[125]] }, { "type": "Polygon", "properties": { "id": "113" }, "arcs": [[126]] }, { "type": "Polygon", "properties": { "id": "114" }, "arcs": [[127]] }, { "type": "Polygon", "properties": { "id": "115" }, "arcs": [[128]] }, { "type": "Polygon", "properties": { "id": "116" }, "arcs": [[129]] }, { "type": "Polygon", "properties": { "id": "117" }, "arcs": [[130]] }, { "type": "Polygon", "properties": { "id": "118" }, "arcs": [[131]] }, { "type": "Polygon", "properties": { "id": "119" }, "arcs": [[132]] }, { "type": "Polygon", "properties": { "id": "120" }, "arcs": [[133]] }, { "type": "Polygon", "properties": { "id": "121" }, "arcs": [[134]] }, { "type": "Polygon", "properties": { "id": "122" }, "arcs": [[135]] }, { "type": "Polygon", "properties": { "id": "123" }, "arcs": [[136]] }, { "type": "Polygon", "properties": { "id": "124" }, "arcs": [[137]] }, { "type": "Polygon", "properties": { "id": "125" }, "arcs": [[138]] }, { "type": "Polygon", "properties": { "id": "126" }, "arcs": [[139]] }, { "type": "Polygon", "properties": { "id": "127" }, "arcs": [[140]] }, { "type": "Polygon", "properties": { "id": "128" }, "arcs": [[141]] }, { "type": "Polygon", "properties": { "id": "129" }, "arcs": [[142]] }, { "type": "Polygon", "properties": { "id": "130" }, "arcs": [[143]] }, { "type": "Polygon", "properties": { "id": "131" }, "arcs": [[144]] }, { "type": "Polygon", "properties": { "id": "132" }, "arcs": [[145]] }, { "type": "Polygon", "properties": { "id": "133" }, "arcs": [[146]] }, { "type": "Polygon", "properties": { "id": "134" }, "arcs": [[147]] }, { "type": "Polygon", "properties": { "id": "135" }, "arcs": [[148]] }, { "type": "Polygon", "properties": { "id": "136" }, "arcs": [[149]] }, { "type": "Polygon", "properties": { "id": "137" }, "arcs": [[150]] }, { "type": "Polygon", "properties": { "id": "138" }, "arcs": [[151]] }, { "type": "Polygon", "properties": { "id": "139" }, "arcs": [[152]] }, { "type": "Polygon", "properties": { "id": "140" }, "arcs": [[153]] }, { "type": "Polygon", "properties": { "id": "141" }, "arcs": [[154]] }, { "type": "Polygon", "properties": { "id": "142" }, "arcs": [[155]] }, { "type": "Polygon", "properties": { "id": "143" }, "arcs": [[156]] }, { "type": "Polygon", "properties": { "id": "144" }, "arcs": [[157]] }, { "type": "Polygon", "properties": { "id": "145" }, "arcs": [[158]] }, { "type": "Polygon", "properties": { "id": "146" }, "arcs": [[159]] }, { "type": "Polygon", "properties": { "id": "147" }, "arcs": [[160]] }, { "type": "Polygon", "properties": { "id": "148" }, "arcs": [[161]] }, { "type": "Polygon", "properties": { "id": "149" }, "arcs": [[162]] }, { "type": "Polygon", "properties": { "id": "150" }, "arcs": [[163]] }, { "type": "Polygon", "properties": { "id": "151" }, "arcs": [[164]] }, { "type": "Polygon", "properties": { "id": "152" }, "arcs": [[165]] }, { "type": "Polygon", "properties": { "id": "153" }, "arcs": [[166]] }, { "type": "Polygon", "properties": { "id": "154" }, "arcs": [[167]] }, { "type": "Polygon", "properties": { "id": "155" }, "arcs": [[168]] }, { "type": "Polygon", "properties": { "id": "156" }, "arcs": [[169]] }, { "type": "Polygon", "properties": { "id": "157" }, "arcs": [[170]] }, { "type": "Polygon", "properties": { "id": "158" }, "arcs": [[171]] }, { "type": "Polygon", "properties": { "id": "159" }, "arcs": [[172]] }, { "type": "Polygon", "properties": { "id": "160" }, "arcs": [[173]] }, { "type": "Polygon", "properties": { "id": "161" }, "arcs": [[174]] }, { "type": "Polygon", "properties": { "id": "162" }, "arcs": [[175]] }, { "type": "Polygon", "properties": { "id": "163" }, "arcs": [[176]] }, { "type": "Polygon", "properties": { "id": "164" }, "arcs": [[177]] }, { "type": "Polygon", "properties": { "id": "165" }, "arcs": [[178]] }, { "type": "Polygon", "properties": { "id": "166" }, "arcs": [[179]] }, { "type": "Polygon", "properties": { "id": "167" }, "arcs": [[180]] }, { "type": "Polygon", "properties": { "id": "168" }, "arcs": [[181]] }, { "type": "Polygon", "properties": { "id": "169" }, "arcs": [[182]] }, { "type": "Polygon", "properties": { "id": "170" }, "arcs": [[183]] }, { "type": "Polygon", "properties": { "id": "171" }, "arcs": [[184]] }, { "type": "Polygon", "properties": { "id": "172" }, "arcs": [[185]] }, { "type": "Polygon", "properties": { "id": "173" }, "arcs": [[186]] }, { "type": "Polygon", "properties": { "id": "174" }, "arcs": [[187]] }, { "type": "Polygon", "properties": { "id": "175" }, "arcs": [[188]] }, { "type": "Polygon", "properties": { "id": "176" }, "arcs": [[189]] }, { "type": "Polygon", "properties": { "id": "177" }, "arcs": [[190]] }, { "type": "Polygon", "properties": { "id": "178" }, "arcs": [[191]] }, { "type": "Polygon", "properties": { "id": "179" }, "arcs": [[192]] }, { "type": "Polygon", "properties": { "id": "180" }, "arcs": [[193]] }, { "type": "Polygon", "properties": { "id": "181" }, "arcs": [[194]] }, { "type": "Polygon", "properties": { "id": "182" }, "arcs": [[195]] }, { "type": "Polygon", "properties": { "id": "183" }, "arcs": [[196]] }, { "type": "Polygon", "properties": { "id": "184" }, "arcs": [[197]] }, { "type": "Polygon", "properties": { "id": "185" }, "arcs": [[198]] }, { "type": "Polygon", "properties": { "id": "186" }, "arcs": [[199]] }, { "type": "Polygon", "properties": { "id": "187" }, "arcs": [[200]] }] } }, "arcs": [[[52723, 52414], [-127, 105], [126, 669], [33, 510], [-84, 422], [-180, 81], [-104, 411], [-88, -154], [-268, 35], [-312, -188], [-165, 204], [-197, 789], [-134, 203], [-472, 6], [-302, -89], [-120, -65], [-910, -786], [-286, 204], [1, 10], [76, 24], [-320, 47], [-516, -116], [-469, -390], [-483, 457], [-310, 594], [-300, 427], [-287, 271], [-180, 450], [-40, 502], [-82, 422], [-396, 687], [-147, 441], [-327, 345], [-7, 422], [53, 301], [-171, 614], [176, 665], [139, 1073], [-46, 754], [-87, 240], [91, 471], [-226, 565], [14, 79], [49, 246], [233, 1143], [399, 1359], [253, 339], [172, 711], [414, 239], [253, 382], [256, 655], [-54, 735], [163, 676], [203, 399], [475, 444], [253, 1013], [150, 50], [276, -422], [397, 102], [9, -30], [192, -117], [908, 805], [524, 185], [515, 50], [125, -141], [596, 249], [339, -83], [369, 240], [382, -205], [-89, -541], [49, -473], [-288, -526], [57, -359], [326, -300], [235, -201], [278, 41], [513, -296], [235, -642], [367, -109], [470, -472], [192, 141], [111, 406], [-63, 289], [178, 484], [291, 214], [410, -163], [3, -186], [524, -205], [47, -180], [609, -166], [468, -311], [370, 392], [433, 9], [156, -187], [181, -88], [296, 154], [79, 155], [173, 868], [240, 899], [-16, 730], [30, 581], [-187, -220], [-220, 128], [-242, -359], [-244, -67], [-216, 297], [-373, 201], [-79, -371], [-202, -72], [-204, 362], [-352, -54], [59, 206], [-172, -30], [-41, 469], [-186, 198], [-78, 260], [149, 232], [-175, 288], [184, 535], [671, 17], [22, 465], [556, -86], [581, 534], [731, -163], [138, -285], [522, -186], [503, 3], [383, 340], [-6, 649], [-420, 431], [-280, 438], [-685, 544], [37, 146], [303, -21], [0, 787], [423, 191], [-290, 55], [-643, -260], [-303, -280], [145, -458], [258, 5], [-57, -167], [-583, -407], [-303, 718], [253, 173], [-720, 403], [-443, -617], [19, -197], [-283, -512], [-17, -338], [-264, -739], [108, -280], [152, -336], [159, -95], [-2, -124], [-446, -11], [-193, -223], [-170, -113], [-48, 192], [-279, 154], [-383, -180], [12, -194], [-104, -76], [-141, 159], [-70, -258], [215, -503], [-160, -228], [341, -330], [-242, -497], [68, -423], [-48, -105], [-290, 339], [-77, -169], [-209, 640], [240, 330], [-231, -62], [-321, 801], [-192, 547], [16, 696], [-242, 325], [-234, 273], [-20, 30], [-458, 423], [-228, 338], [-158, 536], [-83, 48], [-45, -263], [-52, 24], [-85, 361], [32, 60], [-359, -91], [-12, -682], [347, -415], [127, -537], [291, -383], [251, 6], [-1, -297], [332, -213], [335, -316], [-54, -215], [-265, 187], [-140, -471], [183, -170], [-244, -813], [-128, 7], [25, 460], [-158, 763], [-525, 680], [-188, -15], [-542, 677], [-274, 930], [-384, 234], [-340, -363], [-18, -29], [-62, -51], [-377, -351], [-532, 281], [-230, -246], [19, -388], [15, -269], [-326, -398], [-297, -135], [-365, -877], [153, -451], [-654, -1151], [-641, -14], [-251, -333], [-153, -56], [-170, 532], [-254, 134], [-440, -98], [56, 770], [-193, 201], [232, 1317], [-26, 561], [-151, 550], [392, 484], [181, -112], [790, -107], [720, 2], [175, 802], [15, 852], [-245, 457], [-481, 538], [-292, 291], [-10, 225], [478, -6], [113, -209], [364, 88], [-138, 543], [197, 38], [262, -225], [493, 541], [7, 375], [261, 126], [237, 218], [115, -8], [32, -2], [-124, 61], [292, 450], [66, 363], [551, 284], [129, -124], [9, 243], [372, -69], [123, 199], [-97, 578], [-149, 954], [198, 303], [228, 105], [261, 283], [-30, -500], [132, -251], [-407, -552], [-17, -391], [453, -421], [398, 227], [489, -184], [577, 271], [549, 123], [276, -144], [172, 296], [308, 114], [5, 445], [179, 854], [246, 118], [168, -256], [195, -21], [115, 339], [-209, 298], [-23, 476], [626, 261], [637, -106], [346, 295], [-144, 229], [-260, 94], [-1267, -364], [-519, 418], [-42, 1273], [596, 601], [550, 912], [-331, 195], [-641, -166], [-297, -954], [-418, -241], [-492, -715], [-95, -707], [521, -695], [-174, -371], [-452, -307], [-28, -654], [-232, -798], [-324, 35], [-90, -359], [-301, -103], [-569, 1725], [58, 375], [-269, 148], [-547, -571], [-547, -79], [-293, 366], [215, 301], [-297, 134], [145, 374], [-216, 369], [140, 798], [553, 237], [22, 181], [582, 570], [438, 704], [332, 198], [215, 780], [321, 359], [316, 570], [557, 389], [323, 572], [1212, 225], [514, 333], [819, 66], [920, -519], [-66, -276], [772, -275], [652, -87], [1403, -852], [-21, -549], [-274, -366], [-563, -12], [-1235, 370], [282, -354], [77, -899], [699, -425], [221, 125], [-457, 508], [157, 148], [975, -364], [-223, 495], [691, 651], [546, -372], [-98, 744], [83, 432], [-219, 395], [728, -96], [216, -346], [-333, -205], [91, -347], [520, 65], [28, 323], [1559, 782], [396, -423], [1116, 472], [525, 487], [933, -172], [1147, -701], [236, 314], [-557, 469], [-49, 925], [431, 309], [142, 501], [726, 468], [343, -465], [-126, -532], [80, -390], [76, -1143], [79, -552], [-473, -807], [-671, -85], [331, -350], [469, 127], [639, 787], [239, 756], [405, -156], [298, 142], [-384, 351], [-582, -5], [31, 596], [-20, 990], [332, -158], [79, -381], [291, -47], [91, 386], [325, 97], [311, 187], [652, -395], [525, -51], [-812, 538], [36, 591], [1653, 190], [-212, 208], [891, 714], [1846, 366], [267, -143], [1442, 767], [644, -49], [1000, -230], [887, 6], [645, -345], [-161, -665], [-1811, -1036], [1260, 283], [721, -101], [1377, 45], [3, -219], [716, -133], [929, 477], [1001, -193], [405, -255], [-293, -601], [278, -367], [327, -222], [548, 531], [308, -258], [649, 114], [578, -236], [444, 116], [-34, 617], [558, 160], [1498, -242], [572, -375], [891, -474], [1605, 96], [472, -217], [0, -449], [237, -306], [518, 183], [1499, 56], [396, -452], [280, 21], [104, 628], [1366, -150], [1228, -512], [-2, -1087], [-3, -1152], [-458, -418], [255, -354], [113, -596], [-186, -195], [-685, -57], [-628, -244], [-712, -561], [-210, -426], [-136, -95], [-321, 347], [-1144, -279], [-482, -269], [-88, -351], [-301, -530], [371, -218], [-151, -544], [162, -336], [-340, -30], [3, -736], [-584, -389], [-117, -529], [-273, -206], [-247, -781], [-289, -378], [-169, 1180], [-155, 1353], [138, 853], [395, 598], [431, 352], [234, 418], [1157, 1271], [158, 764], [-370, -87], [-236, -488], [-629, -633], [54, 788], [-610, -71], [-759, -897], [-62, -627], [-485, -190], [-316, 220], [-478, 351], [-460, -348], [-723, 277], [-881, -207], [-627, -560], [-623, -809], [-302, -496], [-654, -704], [462, -174], [-55, -451], [571, 292], [534, -42], [240, -615], [-27, -710], [-274, -805], [61, -280], [-138, -927], [-251, -381], [-323, -899], [-614, -1052], [-208, -514], [-551, -472], [-396, 279], [-286, -506], [-292, -429], [19, -412], [-610, -627], [-19, -334], [253, -312], [268, -773], [63, -691], [-154, -597], [-328, -236], [-338, -194], [-93, 482], [137, 470], [-113, 482], [139, 195], [-52, 403], [-553, 166], [213, 688], [-299, 454], [-418, -302], [-280, -406], [-195, -82], [174, 371], [-155, 91], [300, 561], [-313, 241], [-205, -419], [-250, -175], [-145, -403], [-349, -44], [-60, -284], [151, -278], [209, 8], [37, -502], [130, -92], [361, 411], [191, -191], [213, 21], [137, -75], [-460, -472], [-384, -579], [-127, -499], [296, -234], [348, -877], [119, -807], [-438, -110], [449, -163], [-359, -370], [192, 31], [168, -289], [-127, -315], [28, -422], [-125, -240], [-261, -692], [-109, -235], [-60, -609], [-112, -139], [-160, -375], [-425, -577], [-173, -361], [-475, -72], [-154, -149], [59, -82], [-21, -123], [-71, -47], [-61, 49], [7, 95], [46, 92], [-204, 208], [66, -376], [14, -37], [25, -70], [-42, -30], [-165, -121], [-325, -167], [-350, -188], [-5, -400], [-172, -132], [-48, 706], [-328, 129], [-158, -123], [-335, -272], [-60, -450], [-151, -134], [-114, -576], [227, -504], [56, -377], [594, -1200], [184, -739], [8, -685], [-48, -348], [-76, -549], [-220, -371], [-265, -192], [-106, -17], [-113, -462], [-481, -551], [39, 726], [-123, 327], [-229, 47], [14, 324], [-161, -74], [-51, 410], [-301, 591], [-275, 20], [35, 440], [-257, -39], [-5, -697], [-239, -1189], [26, -516], [166, 35], [116, -563], [37, -448], [165, -393], [158, -14], [141, -331], [291, -505], [91, -337], [-4, -1056], [239, -873], [-258, 53], [-578, 755], [-157, 587], [-103, 1235], [-62, 247], [-408, 1116], [-127, 89], [152, 1047], [6, 812], [-53, 821], [-116, 290], [-102, 686], [-39, 956], [-208, 481], [-29, -368], [-380, -578], [-338, 162], [111, 882], [-128, 734], [-182, 284], [69, 347], [-282, 198], [-130, 462], [-180, 851], [-183, 21], [-85, 162], [-10, -312], [-415, -414], [-242, -22], [-57, 178], [-335, -399], [44, -290], [-202, -438], [-259, -193], [-350, -751], [-494, -715], [2, -259], [-294, -150], [-69, -273], [-204, -99], [-58, -380], [81, -959], [-135, -765], [-3, -1002], [-163, -160], [-85, -420], [-199, -178], [-54, -326], [-149, -187], [-270, 498], [-280, 1586], [-198, 673], [-154, 1060], [-227, 787], [-221, 2173], [64, 387], [-94, 947], [-115, -100], [-7, -448], [-311, -285], [-257, 252], [-309, 660], [342, 154], [-432, 363], [-122, 375], [-153, -23], [-132, 495], [-251, 467], [-765, -161], [-531, 5], [-468, 73], [-716, 258], [-83, 619], [-187, 202], [-431, -406], [-302, 122], [-359, 540], [-289, 198], [-363, 1270], [-313, 118], [-116, -253], [-162, 19], [135, -837], [122, -535], [314, -458], [39, -624], [185, -568], [-10, 474], [178, 457], [203, -135], [-49, -613], [-209, -253], [98, -213], [109, -136], [600, 72], [490, 1002], [54, 129], [83, -28], [-28, -249], [29, -374], [214, -590], [454, -255], [279, -756], [-354, -1026], [-115, 91], [-112, -473], [39, -426], [-257, -118], [-158, -502], [-250, -56], [-116, -478], [-279, -15], [-259, -197], [-222, -218], [-18, -374], [-736, -506], [-249, -399], [-185, 8], [-365, -362], [-288, -50], [-218, -353], [-259, -76], [-194, 354], [-153, 1443], [25, 376], [-135, 624], [-162, 262], [-332, 1189], [-244, 281], [-157, 492], [0, 709], [-174, 713], [-259, 279], [-81, 533], [-157, 381], [-402, 1267], [-158, 25], [84, 722], [1, 119], [-19, -39], [-224, -973], [-233, 435], [-186, 806], [-65, -205], [148, -588], [178, -357], [140, -776], [416, -1518], [51, -602], [330, -539], [64, -413], [61, -1221], [60, -259], [292, -406], [176, -1092], [134, -486], [400, -359], [144, -404], [401, -710], [72, -405], [-173, -171], [135, -126], [287, -594], [191, -24], [220, 263], [193, -103], [255, 276], [437, 44], [369, 196], [147, 230], [137, -90], [-32, -731], [-93, -638], [-278, -860], [-223, -1047], [-303, -972], [-533, -1163], [-411, -506], [-300, -541], [-385, -854], [-152, -480], [-378, -614], [-176, -961], [-97, -142], [-115, -780], [191, -476], [-51, -836], [134, -964], [187, -284], [28, -1821], [85, -477], [-71, -583], [-204, -549], [-769, -829], [-168, -407], [-483, -757], [222, -1451], [-121, -1260], [-620, -545], [-99, -234], [104, -516], [-142, -983], [-332, -581], [-220, -741], [-512, -988], [-403, -554], [-395, -156], [-228, -225], [-637, 109], [-458, -209], [-267, -259], [-407, 545], [-179, 604], [119, 96], [-28, 567], [-247, 758], [-221, 1022], [-331, 720], [-228, 1822], [-24, 1085], [-278, 841], [-64, 381], [-363, 1159], [-23, 512], [-4, 838], [145, 604], [66, 753], [313, 688], [32, 923], [-210, 894], [103, 444], [-150, 817], [-154, 455], [253, 146], [-271, 56], [-56, 429], [-248, 623], [-337, 712], [-242, 808], [79, 1108], [136, 215]], [[86664, 77890], [100, -404], [251, 583], [-351, -179]], [[58657, 46892], [-162, 622], [-5, 318], [-227, 395], [55, 203], [-81, 845], [-125, 643], [-30, -1001], [112, -942], [190, -383], [107, -489], [166, -211]], [[59464, 51233], [50, 453], [-71, 294], [-202, 81], [-375, -299], [-38, -501], [-48, -597], [60, -379], [388, 103], [236, 845]], [[66682, 77670], [-33, 299], [139, 272], [-2, 146], [-70, 44], [-122, -261], [-162, -17], [-157, -81], [42, -42], [112, -110], [83, -82], [-70, -230], [48, -270], [152, -26], [40, 358]], [[65852, 75988], [80, -123], [80, -76], [67, 107], [-67, 222], [-74, 16], [-86, -146]], [[64565, 75886], [77, 565], [-217, 60], [-454, 1049], [305, 390], [325, 39], [173, 759], [-549, 232], [-551, -457], [-447, -328], [-255, -756], [151, -135], [60, -686], [311, -677], [365, -850], [-126, -168], [-157, -947], [71, -467], [283, -126], [261, -384], [228, -89], [584, 137], [-28, 301], [18, 898], [-114, 603], [-230, 60], [31, 585], [242, -255], [276, 282], [-227, 555], [-142, -16], [-145, -135], [-16, -392], [-103, 353]], [[57678, 85247], [20, 573], [-123, -116], [18, -376], [85, -81]], [[51407, 82322], [21, -127], [68, 53], [5, 132], [-94, -58]], [[59419, 46241], [100, -416], [13, -721], [-80, -285], [82, -696], [74, -103], [74, 35], [-45, 764], [75, 354], [-13, 89], [-7, 13], [-42, 73], [-6, 20], [-120, 879], [-27, 59], [-28, 48], [-3, 7], [-47, -120]], [[52421, 54028], [94, -40], [-100, -355], [-128, 113], [134, 282]], [[99745, 47026], [23, 54], [39, -103], [6, -119], [-33, 0], [-35, 168]], [[99771, 47233], [-53, -108], [-47, 98], [57, 127], [43, -117]], [[70473, 54273], [-3, -58], [-29, -44], [-51, 1], [-28, 47], [6, 65], [36, 46], [42, -3], [27, -54]], [[70391, 54827], [50, 30], [55, -44], [3, -86], [-40, -77], [-61, 13], [-22, 84], [15, 80]], [[70380, 53869], [65, 9], [32, -55], [12, -84], [-24, -48], [-56, -14], [-42, 42], [-8, 62], [21, 88]], [[32840, 61703], [29, -39], [-11, -41], [-39, 12], [-8, 49], [29, 19]], [[64004, 67159], [152, 16], [-63, -409], [-101, 68], [12, 325]], [[28292, 66386], [110, -210], [50, -206], [79, -207], [-6, -103], [-116, 0], [-54, 221], [-83, 121], [-77, 111], [61, 117], [-31, 155], [67, 1]], [[28541, 66314], [66, 44], [97, -28], [7, -89], [-117, -10], [-53, 83]], [[33463, 59361], [-42, 69], [3, 75], [32, -20], [21, -55], [20, -13], [37, 6], [-24, -55], [-47, -7]], [[62184, 44813], [-114, 80], [-53, 139], [-11, 268], [83, 16], [97, -332], [-2, -171]], [[43362, 60942], [212, -71], [79, -216], [-134, -211], [-208, 58], [-56, 218], [107, 222]], [[32931, 60804], [50, -33], [20, -83], [4, -73], [-38, -37], [-26, 75], [-38, 98], [-10, 92], [38, -39]], [[53320, 84087], [116, -347], [-37, -270], [-154, -129], [-46, 190], [-132, 41], [-112, 276], [149, 222], [216, 17]], [[45518, 68312], [38, -139], [-21, -127], [-52, -87], [-97, -10], [-74, 83], [-11, 139], [25, 140], [97, 54], [95, -53]], [[50890, 74810], [105, -121], [-128, -188], [-126, 195], [149, 114]], [[47940, 87630], [228, 248], [66, -164], [-118, -498], [-176, 414]], [[93905, 55860], [39, 92], [78, 6], [13, -99], [-27, -120], [-75, -28], [-42, 66], [14, 83]], [[49302, 80301], [-68, 6], [27, 36], [48, 30], [-7, -72]], [[32900, 58769], [-53, 3], [22, 115], [51, 132], [49, -7], [-25, -147], [-44, -96]], [[48720, 82994], [21, 159], [61, -46], [-42, -163], [-40, 50]], [[54348, 73970], [0, -249], [-149, -338], [55, -136], [-67, -293], [-735, 662], [92, 215], [364, -74], [440, 213]], [[52533, 75595], [67, 18], [129, -435], [-75, -795], [-195, -151], [-134, 203], [17, 412], [-56, 555], [247, 193]], [[49410, 80211], [48, -21], [-4, -44], [-75, 22], [31, 43]], [[5845, 53105], [71, 63], [103, -18], [51, -131], [-52, -125], [-105, -43], [-67, 105], [-1, 149]], [[32592, 61827], [48, -92], [-3, -55], [-33, 12], [-15, 58], [-44, 46], [-12, 55], [13, 28], [46, -52]], [[33069, 59738], [-35, 53], [0, 121], [56, 73], [25, -74], [-5, -149], [-41, -24]], [[97513, 55954], [34, -26], [68, 2], [17, 37], [-17, 61], [35, -45], [-4, -44], [-22, -31], [-84, -14], [-55, 30], [-15, 98], [43, -68]], [[54040, 72433], [-90, 6], [-34, 130], [57, 97], [108, -98], [-41, -135]], [[66031, 40264], [25, -109], [-37, -112], [-85, 12], [-16, 115], [47, 86], [66, 8]], [[96394, 51519], [-21, -13], [-19, 10], [-8, 28], [9, 27], [18, 8], [19, -10], [5, -25], [-3, -25]], [[87404, 56211], [25, 121], [47, 98], [-9, -152], [-40, -186], [-80, -201], [-45, -29], [36, 183], [66, 166]], [[78965, 52628], [-32, -76], [-74, -21], [-72, 42], [-49, 100], [227, -45]], [[51857, 51880], [-55, 27], [-26, 94], [15, 98], [58, 44], [70, -32], [12, -105], [-27, -78], [-47, -48]], [[65412, 49233], [40, -73], [15, -203], [-51, 43], [-42, 135], [38, 98]], [[1320, 39750], [117, -57], [-87, -159], [-75, 148], [45, 68]], [[32999, 59383], [0, 100], [5, 59], [29, 10], [27, -23], [-14, -142], [-34, -110], [-13, 106]], [[2148, 44096], [251, -309], [-87, -44], [-243, 131], [-64, 177], [143, 45]], [[34952, 54919], [63, 229], [264, -166], [277, -464], [87, -353], [98, -74], [66, -308], [174, -899], [155, -87], [5, -287], [-322, -709], [-287, -503], [228, 117], [241, 382], [228, -2], [285, -162], [-97, -885], [132, 143], [107, 567], [518, -150], [458, -533], [43, -405], [294, 117], [297, -281], [626, -8], [419, -489], [360, -699], [465, -134], [198, -1160], [-4, -431], [-137, -741], [-307, -754], [-137, -156], [-319, -1076], [-187, 10], [-88, -428], [-7, -754], [56, -673], [-76, -1057], [-163, -484], [4, -517], [-378, -1213], [29, -245], [-278, -338], [-25, -241], [-502, 27], [-232, -116], [-204, -321], [-426, -365], [-238, -343], [-209, -564], [-66, -1576], [-277, -480], [-140, -587], [-592, -1470], [49, 200], [288, 717], [109, 443], [-119, 16], [-74, -288], [-118, -319], [-183, -820], [-211, -367], [-107, -375], [-326, -333], [-381, 36], [-225, 256], [-204, -5], [-148, 305], [52, 861], [-103, -1061], [396, -689], [-29, -395], [162, -392], [-258, -750], [-408, -311], [-682, -183], [-242, 113], [102, -317], [-130, -543], [43, -325], [-401, -165], [-308, 261], [-50, -737], [350, -49], [52, -392], [-227, 140], [1, -270], [-250, -401], [-74, -781], [-166, 20], [-315, -357], [-80, -317], [232, -485], [224, -35], [3, -565], [-441, -558], [-77, -540], [-290, -217], [-81, -373], [200, -788], [-276, 54], [-393, -277], [-49, -620], [-601, 328], [-215, 263], [-196, 625], [-107, 709], [199, 220], [-78, 1335], [235, 518], [-308, -268], [-150, 46], [17, 464], [127, 549], [138, 613], [155, -51], [-38, -692], [-88, -388], [173, 42], [94, 786], [18, 451], [228, 1261], [-137, 289], [-223, -153], [-52, 447], [65, 573], [131, 281], [-119, 1020], [128, 322], [156, 918], [116, 259], [168, 907], [59, 675], [-62, 1228], [97, 189], [-66, 559], [97, 333], [203, 1737], [-39, 473], [146, 1780], [-93, 1783], [-276, 375], [-35, 232], [-608, 613], [-413, 497], [-306, 735], [19, 417], [-396, 1190], [-372, 1771], [-272, 823], [-315, 412], [-42, 1056], [253, 487], [107, 113], [-7, 267], [-95, 13], [-117, 351], [-48, 597], [236, 644], [6, 453], [293, 162], [45, 181], [137, 698], [155, -40], [207, 775], [-112, 134], [26, 1376], [-154, 398], [-161, 384], [79, 301], [-203, 214], [-229, -83], [-201, -248], [132, -413], [-189, -88], [-87, 186], [-125, 138], [-303, 136], [-102, -66], [-234, 339], [30, 237], [-291, 355], [-122, -55], [-210, 460], [48, 418], [-541, 1032], [93, 63], [-140, 245], [-269, -93], [-363, 278], [-340, 131], [-258, 340], [-459, 889], [-265, 196], [-162, -262], [-311, -182], [-338, 185], [-301, 316], [-612, 424], [-209, 360], [-469, 256], [-134, 311], [-288, 285], [-189, 598], [139, 625], [-167, 660], [-690, 1422], [-321, 395], [59, 312], [-386, 851], [-176, 138], [-251, 539], [-271, 1051], [22, 199], [-523, 433], [76, -994], [504, -1004], [20, -332], [266, -662], [407, -1498], [243, -319], [-117, -395], [-114, 384], [-495, 710], [-71, 809], [-228, 352], [-131, -37], [-394, 654], [246, 52], [35, 292], [-459, 748], [-103, 609], [-294, 990], [-268, 690], [-335, 314], [-327, 101], [-48, 397], [-178, 302], [-310, 881], [-75, 425], [-293, 568], [-35, 527], [-154, 352], [96, 571], [-135, 812], [110, 597], [70, 1651], [-237, 819], [706, -105], [-150, 579], [-45, 0], [-680, 894], [-241, -29], [-435, 430], [-18, 561], [-282, 628], [-440, 601], [139, 533], [-278, 5], [-109, 342], [-254, 330], [-548, 1016], [-432, 271], [-297, -182], [-395, 410], [-566, 358], [-687, 237], [-311, -67], [-870, 584], [-368, -133], [-17, -472], [-265, 22], [-492, -455], [-201, 333], [88, 696], [-413, -740], [-303, -189], [238, -310], [-244, -361], [-515, -369], [-147, -342], [-523, -314], [-78, -278], [-310, -59], [-659, -468], [-315, 46], [419, 438], [346, 63], [799, 949], [172, 720], [-297, -157], [-496, 140], [-395, -114], [-323, 771], [-303, -114], [-504, 434], [212, 157], [-426, 442], [-47, 865], [618, 96], [221, -133], [711, 412], [-109, 687], [-542, -303], [-849, 99], [-525, 580], [934, 555], [288, -275], [417, -1], [68, 388], [-487, 203], [-281, 396], [-513, 328], [86, 297], [525, 31], [678, 802], [1073, 297], [341, 270], [1343, -494], [692, 43], [1361, -311], [358, 77], [638, -268], [1427, -429], [806, 701], [1425, 66], [527, -475], [256, 367], [236, -344], [338, 222], [423, -41], [941, -428], [835, -86], [313, -274], [-452, -268], [465, -137], [1329, 15], [420, -650], [-199, 1168], [558, 164], [496, -503], [605, -179], [1003, 23], [-6, 349], [472, -25], [155, -490], [810, 628], [-216, 512], [-555, 287], [-155, 612], [647, 569], [433, -371], [291, -768], [-78, -313], [495, -352], [417, 209], [255, -244], [-63, -595], [485, -229], [329, 1422], [751, -116], [375, -580], [-335, -89], [343, -590], [-81, -267], [-601, -459], [-601, -21], [-424, -480], [-641, 355], [180, -356], [584, -107], [-290, -548], [-501, 34], [-131, -370], [-822, 175], [676, -296], [39, -189], [-503, -159], [-425, -769], [-233, -870], [107, -705], [356, 12], [204, -801], [-79, -230], [465, 178], [598, -233], [361, -468], [824, -462], [656, -73], [-14, -1239], [533, -936], [177, -84], [346, 668], [-51, 360], [-175, 697], [-125, 266], [381, 216], [482, 602], [19, 690], [-136, 398], [-415, 411], [371, 766], [-258, 497], [172, 355], [-169, 468], [184, 168], [756, -248], [306, 187], [638, -768], [455, -201], [-11, -283], [53, -470], [306, -543], [403, -211], [355, 244], [467, 1063], [412, -1072], [392, -959], [182, -649], [445, -544], [435, -167], [-416, -359], [400, 79], [214, -352], [230, -80], [36, -702], [-356, -395], [-413, -63], [-382, -569], [-566, -56], [-1263, 19], [-268, -533], [-470, -335], [2, -148], [644, 361], [221, 165], [187, 53], [199, -148], [80, -268], [-69, -245], [-163, -246], [-36, -523], [200, -451], [568, -360], [154, 173], [255, -335], [-604, -435], [-315, -7], [-325, -631], [-153, 134], [8, 505], [459, 425], [-114, 179], [-320, -241], [-352, -18], [-208, -366], [-371, -34], [-367, -696], [-54, -291], [39, -344], [193, -242], [-19, -100], [-409, -56], [-392, -137], [-211, -143], [-59, -192], [540, 211], [76, -175], [-639, -384], [45, -226], [-240, -479], [-173, 203], [108, -428], [2, -449], [-150, -239], [-87, 352], [-181, 481], [75, -565], [43, -363], [69, -190], [-99, -789], [-145, 95], [17, -471], [-170, -29], [-249, -455], [-203, -65], [-117, -343], [-319, -402], [-278, -542], [-52, -397], [217, -1429], [195, -900], [-130, -928], [-161, -46], [-176, 453], [-94, 552], [-216, 588], [57, 568], [-387, 711], [-240, -217], [-410, 375], [-693, 15], [-173, -189], [-67, -253], [70, -320], [-220, -30], [-296, 151], [-144, 309], [-120, -171], [-256, 138], [-469, -229], [-198, -353], [-234, -96], [-308, -914], [115, -601], [-143, -835], [-66, -1106], [206, -1123], [388, -1083], [357, -358], [843, 423], [195, 286], [103, 936], [159, 163], [507, 182], [315, -96], [-13, -333], [-241, -714], [86, -71], [-110, -718], [-73, 73], [-53, -456], [18, -360], [-133, -641], [132, -67], [138, 113], [385, -81], [116, 128], [452, -111], [58, -260], [265, -209], [-122, -985], [21, -511], [-104, -590], [62, -259], [298, -777], [91, -324], [261, -134], [353, 445], [285, -9], [273, -180], [181, -323], [118, -69], [369, 522], [31, 653], [185, 302], [134, -193], [48, 312], [249, -13], [312, 475], [29, 134], [102, 65], [106, -126], [-3, -228], [-176, -149], [98, -505], [-144, -512], [169, -447], [132, 410], [-132, 604], [397, 373], [50, 108], [-106, 80], [-18, 137], [67, 76], [104, -79], [8, -294], [235, -31], [256, -568], [469, 105], [118, -238], [300, -74], [171, 296], [393, 80], [113, -179], [-84, -406], [271, 89], [237, -322], [-74, -442], [286, -8], [238, -287], [305, -713], [250, -424], [-22, -346], [61, 320], [826, -145], [-33, -254]], [[25116, 79484], [-397, -290], [-301, -397], [142, -117], [194, 212], [125, -226], [596, 623], [68, -116], [-16, -260], [264, -268], [611, 142], [128, -189], [-98, 840], [-282, 39], [-160, 443], [-510, 136], [-364, -572]], [[26637, 78534], [-175, -282], [-629, 30], [-177, -520], [86, -117], [-161, -885], [24, -569], [147, -375], [176, 143], [121, 627], [-89, 382], [76, 611], [284, 393], [196, 146], [286, -153], [44, -593], [184, -235], [76, -521], [191, 210], [125, 706], [-91, 371], [416, -447], [91, 199], [-270, 637], [-931, 242]], [[27043, 76351], [-226, -481], [265, -188], [231, 73], [611, 510], [168, 252], [-16, 58], [-676, -171], [-351, -352], [-6, 299]], [[28039, 76766], [652, 35], [256, 667], [-346, -302], [-570, -84], [-191, -286], [199, -30]], [[30823, 42305], [116, 195], [-208, 400], [-180, -194], [251, -216], [41, 5], [-20, -190]], [[52621, 76475], [6, -441], [-23, -331], [-58, -12], [-77, 95], [-69, 390], [30, 166], [115, 52], [5, 105], [71, -24]], [[32806, 61180], [46, 92], [72, -80], [46, 133], [33, -144], [-8, -124], [-93, 47], [-48, -69], [-48, 145]], [[33165, 60197], [-31, -80], [-78, 31], [-30, 76], [-15, 115], [40, 54], [72, -83], [42, -113]], [[65484, 39987], [81, -29], [40, -94], [-13, -104], [-99, 15], [-51, 69], [-10, 99], [52, 44]], [[89749, 83174], [148, -902], [-58, -494], [294, -1550], [-340, 61], [-141, -774], [230, -865], [-240, 125], [-35, -406], [-137, -91], [-76, 403], [103, 786], [-32, 501], [127, 1356], [-119, 429], [12, 901], [125, 91], [46, 300], [93, 129]], [[12, 89353], [3, 1217], [1, 974], [1517, -1101], [823, -84], [420, -456], [-140, -244], [-409, -122], [-292, -712], [-623, 340], [-208, 386], [-655, 13], [-437, -211]], [[64052, 91773], [-307, -404], [-285, -8], [-17, 447], [283, 370], [283, -92], [43, -313]], [[21, 92731], [1, 298], [344, 35], [403, -224], [-748, -109]], [[89728, 94628], [413, -100], [-306, -443], [-810, 80], [703, 463]], [[90757, 95319], [974, -53], [777, -41], [-1350, -300], [-401, 394]], [[88641, 95670], [627, 48], [1115, -385], [-465, -326], [-1212, -149], [-610, 257], [-23, 341], [568, 214]], [[68651, 95674], [-1602, -444], [-620, -512], [-186, -152], [-385, -356], [-412, -696], [138, -631], [426, -305], [-688, -102], [-548, 161], [-267, 491], [390, 1195], [1472, 1214], [1118, 196], [715, 216], [312, -31], [137, -244]], [[78591, 97501], [521, -346], [-1643, -645], [672, 969], [450, 22]], [[77159, 97993], [700, -292], [-233, -632], [-1274, 38], [-442, 553], [1249, 333]], [[63563, 98386], [798, -78], [904, 59], [596, 97], [644, 10], [-1383, -924], [-752, -157], [-510, 266], [-297, 727]], [[76802, 98861], [546, -404], [-1528, -412], [982, 816]], [[30936, 21519], [49, -379], [547, -673], [369, -100], [-385, -237], [-587, 95], [-585, 26], [-268, 251], [326, 226], [37, 577], [278, 322], [219, -108]], [[99999, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-3, 0], [-135, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-123, 0], [-16, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [-139, 0], [-138, 0], [-139, 0], [0, 271], [0, 271], [0, 271], [0, 271], [0, 271], [0, 271], [0, 271], [0, 271], [0, 272], [0, 271], [0, 271], [0, 271], [1830, -95], [748, 760], [3657, -111], [307, 1291], [2047, 963], [-2069, 469], [-586, 460], [198, 465], [1781, -207], [657, -152], [1056, 359], [-792, 559], [552, 99], [2476, 384], [543, 396], [410, -212], [1924, 145], [1435, -63], [1091, 159], [1283, 62], [28, -274], [840, 190], [131, -400], [884, -43], [875, 134], [607, -200], [753, 113], [-832, 422], [-415, 529], [48, 338], [1389, -16], [3315, -83], [552, -331], [712, 8], [440, 398], [668, -445], [1931, 299], [773, 264], [212, 428], [15, 813], [-317, 601], [275, 266], [-41, 983], [311, 673], [555, 722], [435, 417], [395, 241], [708, 365], [357, -14], [-806, -654], [-624, -504], [-61, -217], [-313, -176], [-342, -596], [24, -629], [264, -264], [373, -543], [85, -595], [324, -455], [284, -953], [-216, -767], [-689, -625], [-1926, -729], [-2060, 69], [551, -568], [779, -20], [-603, -341], [-757, 72], [57, -217], [-801, -246], [-964, 506], [-33, -260], [960, -483], [1083, -31], [224, -868], [1278, 125], [1653, -524], [923, -1069], [661, -53], [1308, 668], [2356, 225], [630, -277], [804, 671], [1600, 351], [1555, 254], [-254, 338], [-1549, 424], [703, 888], [1350, 551], [809, 242], [1965, 394], [394, 526], [473, -54], [386, 330], [-368, 139], [341, 263], [862, 439], [143, 468], [386, 280], [500, -322], [-57, 479], [606, 54], [-132, -365], [1773, 9], [635, 259], [1847, 341], [746, -272], [310, 423], [244, -174], [1179, -112], [864, -155], [166, 332], [423, -331], [119, 235], [748, -363], [944, 415], [806, 172], [-51, 666], [733, -252], [12, -254], [707, 31], [257, -292], [318, 783], [2106, 818], [355, -157], [139, 497], [489, -201], [-182, 446], [948, 315], [521, -104], [1084, -910], [307, 119], [842, -59], [1313, -226], [327, 90], [174, -435], [-132, -480], [-688, -563], [545, -234], [-484, -682], [-125, -581], [731, 273], [833, 1288], [1448, 613], [358, 566], [1620, 617], [834, 176], [669, -29], [441, 186], [494, -144], [1330, 172], [83, -265], [697, 556], [715, -20], [1174, -372], [641, -19], [134, 347], [633, 167], [716, -589], [-14, -280], [732, 131], [145, -215], [1947, 641], [224, -311], [655, -189], [463, 592], [851, 24], [88, -230], [569, 149], [1172, -310], [859, -35], [331, -156], [217, -230], [788, -555], [1546, -162], [-3, 280], [699, -535], [945, -172], [621, -819], [29, 351], [1558, -275], [731, -582], [-195, -715], [-1400, -509], [-667, -842], [231, -936], [852, -895], [-1498, -271], [191, -524], [-348, -723], [2350, -1034], [3169, -780], [0, -271], [0, -271], [0, -271], [0, -272], [0, -271], [0, -271], [0, -271], [0, -271], [0, -271], [0, -271], [0, -271], [0, -271]], [[33312, 5936], [-160, -729], [-1680, 315], [1217, 262], [623, 152]], [[5474, 6183], [340, -319], [-1844, -177], [932, 791], [572, -295]], [[31435, 6660], [-975, -726], [-69, 468], [1044, 258]], [[37402, 6513], [448, -62], [58, -806], [-2953, -390], [227, 443], [856, 329], [330, 861], [872, 129], [588, -248], [-426, -256]], [[16335, 9502], [-142, -508], [-378, 409], [520, 99]], [[14976, 9617], [569, -197], [8, -356], [-906, 314], [329, 239]], [[29462, 10104], [106, -424], [-714, 20], [608, 404]], [[23128, 10579], [340, -443], [-1032, 15], [-851, 144], [963, 211], [580, 73]], [[30549, 11985], [479, -966], [-165, -696], [-596, -349], [-381, 353], [-443, -59], [-376, 144], [428, 419], [406, -45], [365, 164], [90, 352], [-336, 244], [-24, 575], [553, -136]], [[90109, 28535], [481, -348], [527, 265], [128, -218], [-49, -743], [-96, -548], [-165, -31], [-143, -209], [-231, 50], [-210, 546], [-242, 1236]], [[88211, 31313], [78, -352], [-389, 41], [-57, 380], [368, -69]], [[86176, 45448], [285, 61], [168, -280], [-245, -209], [-283, 72], [75, 356]], [[89596, 45671], [147, -933], [99, -164], [27, -655], [114, -438], [149, 202], [241, -451], [15, -864], [208, -685], [35, -716], [391, -549], [244, -129], [186, -598], [196, -643], [247, -283], [-3, -411], [268, -352], [396, -1101], [0, -640], [111, -1049], [-296, -2059], [-196, -244], [-252, -844], [-46, -489], [-169, -412], [-40, -1039], [-473, -72], [-426, -459], [-96, -297], [-292, 349], [-511, -189], [-316, 283], [-207, -19], [-359, 298], [-172, 404], [31, 322], [-164, 431], [-295, 116], [93, 536], [-64, 322], [-189, -452], [-125, 1005], [-275, -321], [-161, -634], [-192, 621], [-226, 724], [-518, 295], [-294, 320], [-607, -123], [-473, -335], [-306, 23], [-575, -512], [-164, -470], [-554, 68], [-425, -61], [-449, -566], [-485, -82], [-422, 396], [-37, 485], [189, 135], [4, 944], [-196, 826], [1, 423], [-226, 791], [-43, 455], [-88, 235], [-143, 322], [-99, 465], [230, -161], [110, 70], [-93, 331], [-83, 620], [93, 309], [-28, 538], [101, 414], [100, -83], [76, 92], [225, 190], [379, 555], [148, -102], [218, 210], [783, 420], [241, 681], [139, 173], [-42, 513], [219, 392], [165, -541], [85, 178], [-89, 544], [188, 60], [48, 368], [150, 106], [118, 480], [507, 463], [276, -574], [399, -141], [-70, 308], [214, 845], [241, 406], [467, 57], [-29, 375], [146, 50], [118, -264], [251, -73], [320, -91], [242, 115], [133, -234], [-77, -383], [-197, -140], [-9, -540], [-148, -298], [369, -693], [648, -576], [267, -456], [231, 147], [167, 800], [45, 2037], [161, 919], [104, 128]], [[81666, 54489], [309, 224], [204, 328], [258, 845], [269, -367], [8, -277], [177, -65], [238, -342], [-193, -176], [20, -261], [-299, -163], [-34, -418], [179, -675], [-63, -217], [317, -532], [-331, -87], [-103, -770], [-295, -714], [62, -264], [-177, -798], [-373, -323], [-25, 256], [-250, 155], [-143, 126], [-139, -107], [-221, -70], [-132, 289], [-301, 23], [-95, 1094], [-180, 144], [7, 498], [-123, 473], [67, 420], [152, 301], [158, -246], [260, 155], [81, 434], [435, 278], [276, 829]], [[31432, 20057], [-213, -172], [-247, -11], [-131, -232], [-141, -57], [-107, 126], [-130, 115], [-99, 307], [327, -6], [247, -9], [494, -61]], [[29676, 21015], [476, -253], [-215, -133], [-261, 386]], [[29257, 23038], [-134, -153], [-136, 581], [13, 631], [166, 89], [12, -569], [79, -579]], [[29474, 27613], [168, 73], [-134, -1022], [-195, 36], [161, 913]], [[29140, 63299], [-38, 2], [-696, -26], [182, 351], [-273, 142], [-195, 535], [-313, 34], [-155, 213], [-381, 69], [-15, 283], [-251, 9], [-176, -293], [-307, -230], [123, 506], [516, 304], [444, -60], [540, -422], [254, -313], [489, -424], [81, -223], [261, -37], [140, -321], [-230, -99]], [[59170, 71751], [-120, 63], [-56, 141], [57, 163], [118, 13], [20, 117], [157, -30], [233, 162], [-161, -292], [35, -127], [-104, -78], [-37, -103], [-142, -29]], [[30067, 63192], [205, 129], [312, -172], [80, -313], [348, -251], [-137, -163], [-515, 32], [-198, -475], [-100, 250], [-82, 114], [-438, 13], [-142, 230], [285, -97], [103, 224], [-112, 610], [391, -131]], [[99996, 42523], [2, -310], [-315, -200], [-72, 228], [385, 282]], [[99519, 41844], [117, -203], [20, -261], [-105, -144], [-174, 21], [-135, 161], [-13, 272], [97, 182], [193, -28]], [[33555, 22281], [-414, -543], [123, 709], [291, -166]], [[33671, 22279], [359, -43], [-95, -255], [-363, -216], [-244, -4], [343, 518]], [[47986, 83558], [319, 82], [157, -319], [-204, -323], [76, -652], [-193, -577], [-557, -223], [-468, 174], [80, 389], [148, 342], [-171, 153], [92, 527], [382, -30], [53, 510], [286, -53]], [[49070, 85622], [-203, -409], [644, -270], [-394, -816], [429, -272], [545, -1439], [400, -346], [-220, -381], [105, -399], [-301, -221], [-359, 55], [-687, -170], [-42, -186], [-498, -18], [527, 694], [-486, 298], [304, 209], [12, 546], [269, 86], [108, 431], [-660, 509], [154, 280], [-254, 331], [-181, 485], [104, 537], [228, 452], [456, 14]], [[56639, 72302], [518, -110], [132, -171], [-418, -62], [-339, 209], [107, 134]], [[56498, 74314], [253, -249], [-14, -173], [-314, 299], [75, 123]], [[35353, 92117], [163, -260], [-300, -105], [-423, 201], [81, 385], [479, -221]], [[42931, 92514], [-521, -239], [-125, 117], [37, 147], [620, 199], [228, -55], [63, -228], [-302, 59]], [[41053, 99999], [3019, -569], [-14, -312], [37, -326], [1042, -75], [476, 256], [625, -359], [-624, -463], [-914, -74], [34, -649], [-28, -597], [203, -521], [-938, -549], [490, 1], [142, -594], [-651, -454], [341, -570], [-492, -114], [-465, 200], [-600, -205], [445, -471], [777, -538], [76, -544], [-519, -60], [-256, 369], [-365, 61], [-650, -177], [-87, -293], [264, -219], [549, 243], [815, -172], [-1087, -818], [-1034, -328], [-552, -43], [-542, -748], [-591, -470], [-569, -69], [-815, -413], [151, -791], [-531, -511], [-198, -1589], [-383, -24], [-310, 353], [-393, 143], [-443, 196], [-671, 1120], [-307, 618], [-299, 823], [-202, 802], [375, 834], [408, 22], [51, 703], [-1004, 535], [195, 156], [404, -123], [-74, 378], [-387, 167], [-506, -20], [-103, 588], [68, 319], [-212, 474], [-271, 455], [-569, 597], [-1017, 271], [-1376, -172], [-549, 414], [-247, 518], [-444, 263], [85, 212], [1479, 269], [343, 211], [-726, 258], [505, 193], [1618, 779], [1822, 508], [1092, -336], [-166, 415], [1653, -414], [397, 355], [3200, 695]], [[83336, 46449], [248, -120], [131, -237], [-199, -102], [-203, 162], [-275, 174], [298, 123]], [[84738, 46375], [-178, -390], [-350, -214], [-47, 343], [180, 285], [67, 192], [166, 81], [110, 60], [75, 135], [490, 295], [237, -105], [-342, -267], [-408, -415]], [[82450, 47053], [-65, -308], [-147, 56], [51, 273], [161, -21]], [[82769, 47173], [282, -120], [15, -185], [-199, -20], [-242, -94], [-132, 53], [46, 253], [230, 113]], [[84455, 47255], [-1, -122], [-290, -164], [-52, -90], [-376, -216], [-426, 66], [-49, 259], [131, 74], [370, -36], [693, 229]], [[82081, 47144], [114, -162], [-103, -123], [-127, 64], [-92, 121], [4, 91], [204, 9]], [[88478, 47142], [-305, -176], [-54, 400], [137, 277], [227, 89], [73, -267], [-78, -323]], [[81944, 47870], [-95, -176], [-308, -22], [-141, 188], [544, 10]], [[79488, 48377], [331, -41], [305, -166], [153, -248], [409, -84], [159, 218], [433, -194], [172, -408], [346, -126], [-31, -333], [67, -211], [-389, 287], [-146, -98], [-610, 193], [-340, 221], [-257, -51], [-501, 234], [4, 247], [-301, 100], [-32, 186], [228, 274]], [[87383, 48714], [153, 78], [18, -490], [-26, -298], [-193, -93], [24, 391], [24, 412]], [[85297, 50004], [48, -242], [-140, -146], [-174, 59], [-34, 293], [141, 136], [159, -100]], [[85861, 50194], [555, -304], [-72, -277], [-259, 191], [-246, 74], [-248, -19], [-94, 283], [364, 52]], [[79957, 50370], [108, -98], [17, -184], [-109, -98], [-129, 92], [-3, 220], [116, 68]], [[84591, 50897], [745, 16], [-76, -253], [-704, 24], [35, 213]], [[87632, 50923], [-46, 267], [219, -101], [249, 36], [-4, -250], [-226, -18], [-192, 66]], [[79409, 50981], [159, -476], [133, -173], [-21, -161], [-147, -97], [-47, 191], [-96, 309], [-185, 57], [-30, 260], [88, -2], [146, 92]], [[77461, 51384], [113, -302], [51, -238], [-88, -48], [-101, 170], [-99, 277], [25, 177], [99, -36]], [[89159, 46594], [-290, 574], [-304, -17], [71, 333], [-283, 1233], [-584, 519], [-207, 33], [-371, 378], [-256, -177], [-10, 322], [-203, 505], [197, 183], [-233, 146], [-73, 337], [-236, 43], [79, 361], [407, 264], [352, -209], [135, -1232], [280, -288], [259, 658], [229, 84], [157, 340], [575, -511], [309, -132], [847, -497], [496, -805], [-23, -323], [478, -311], [113, -420], [-244, -29], [59, -416], [257, -341], [124, -563], [161, 34], [24, -295], [230, -132], [-32, -200], [209, -285], [-754, 225], [-257, 407], [-270, 790], [-590, 67], [-271, -209], [118, -361], [-209, -212], [-466, 129]], [[77059, 52830], [146, -423], [-66, -238], [-197, 543], [117, 118]], [[84739, 52803], [90, -153], [-296, -581], [-347, 67], [-642, -131], [-85, -366], [61, -604], [229, 309], [489, 204], [225, -49], [-114, -251], [-358, -164], [-188, -344], [172, -587], [-31, -363], [196, -368], [-395, -265], [40, 328], [-204, 315], [52, 450], [-193, -263], [-18, -1322], [-269, 89], [76, 600], [-92, 510], [-148, 194], [159, 646], [-2, 435], [113, 335], [91, 793], [78, 196], [157, 155], [159, -134], [639, -93], [356, 412]], [[85602, 52942], [-86, -436], [252, 278], [93, -145], [-234, -404], [317, -70], [-39, -275], [-285, -34], [111, -418], [-60, -217], [-266, 420], [-70, 441], [0, 436], [124, 607], [143, -183]], [[76528, 55067], [173, -186], [381, -17], [224, -675], [402, -518], [225, -590], [136, 78], [296, -522], [96, -352], [360, -308], [-115, -539], [287, -193], [140, -722], [206, -68], [125, -491], [-81, -1482], [-72, -35], [-113, 189], [-159, -162], [-236, 513], [-384, 553], [-335, 809], [-223, 1020], [-192, 527], [-131, 100], [-168, 958], [-243, 274], [-16, 262], [-604, 1129], [-95, 324], [116, 124]], [[75774, 59507], [77, 368], [75, -234], [-96, -591], [-76, -702], [-44, 254], [-5, 254], [69, 651]], [[45544, 90163], [551, -181], [196, -547], [-332, -500], [-459, -356], [-704, -225], [-677, 276], [-245, 490], [-514, 13], [290, 288], [-467, 149], [9, 445], [432, 234], [344, -370], [331, -206], [173, 324], [538, -116], [534, 282]], [[28693, 62468], [227, -91], [195, -176], [-87, -110], [-188, 29], [-201, -74], [-184, 87], [-255, 223], [191, 90], [302, 22]], [[86383, 71299], [208, -118], [82, -379], [-191, -893], [-189, -213], [-121, 140], [-12, 488], [70, 165], [-59, 261], [-107, -80], [-75, 298], [394, 331]], [[87266, 71631], [200, -128], [-192, -514], [-182, 110], [-195, -318], [-125, 334], [125, 300], [189, -13], [180, 229]], [[89242, 75658], [221, -1044], [-270, -674], [-16, -572], [-132, -631], [77, -311], [-254, -481], [-41, 234], [-435, -346], [-377, 15], [-207, -546], [-257, 32], [63, 410], [-287, 104], [-280, -211], [-646, -185], [-7, 203], [575, 690], [422, 77], [333, -120], [255, 1009], [158, 145], [44, -313], [219, 113], [330, 568], [171, 769], [-53, 625], [192, 276], [202, 164]], [[89448, 78021], [260, 142], [216, -915], [474, -33], [-21, -435], [-478, -369], [-115, -420], [-429, 272], [-239, -116], [56, -299], [-226, -163], [-92, 727], [359, 275], [235, 1334]], [[72335, 57431], [266, -707], [143, -665], [-55, -498], [-303, -310], [-203, 509], [-64, 1337], [216, 334]], [[63708, 44875], [164, -544], [151, -1387], [-71, -304], [-164, 245], [58, -580], [-97, -717], [-444, -2698], [-215, -1413], [-553, -374], [-307, 337], [-90, 341], [14, 549], [-148, 702], [79, 533], [270, 804], [-149, 1416], [253, 708], [379, 299], [209, 293], [493, 1029], [66, 621], [102, 140]], [[56347, 96975], [270, -168], [-387, -552], [-419, 190], [-159, 469], [425, 204], [270, -143]], [[54672, 97846], [1164, -634], [-561, -177], [-606, -1095], [-859, 692], [-836, 1033], [1067, 144], [500, -516], [131, 553]], [[56428, 98137], [1113, -303], [-860, -384], [-579, -35], [-936, 561], [1262, 161]], [[98028, 28506], [117, -328], [210, 74], [59, -449], [-521, -1156], [-298, -312], [-179, -938], [-296, -387], [-338, -13], [-536, 457], [189, 866], [712, 426], [386, 560], [273, 982], [222, 218]], [[98077, 32018], [414, -681], [69, -708], [327, -466], [333, -209], [221, 260], [159, -100], [-194, -795], [-266, -201], [-20, -421], [-418, -825], [-148, 136], [93, 482], [-85, 365], [-316, 243], [247, 370], [76, 619], [-230, 862], [-375, 1030], [113, 39]], [[84900, 57375], [182, -120], [46, -676], [41, -549], [-113, -563], [-82, 449], [-145, -179], [89, -356], [-89, -332], [-175, 4], [-253, 460], [-16, 675], [-160, -132], [-185, 70], [-169, -267], [98, 593], [408, 345], [107, -124], [176, 320], [208, 45], [32, 337]], [[84241, 58162], [85, -88], [-151, -1031], [-177, 462], [134, 162], [109, 495]], [[84443, 58219], [43, -467], [-171, -321], [128, 788]], [[83282, 58448], [43, -482], [-273, -475], [-106, -348], [-392, -504], [451, 1072], [112, 215], [165, 522]], [[84567, 58432], [150, -38], [68, -649], [-125, -59], [-93, 746]], [[83971, 58613], [263, -59], [-153, -622], [-207, -84], [97, 765]], [[84699, 59074], [161, -180], [19, -565], [-89, -101], [-270, 830], [179, 16]], [[83659, 59544], [160, -343], [-141, -327], [-246, 751], [227, -81]], [[83585, 62533], [316, -12], [134, -838], [-83, -445], [-181, -223], [-55, -359], [98, -641], [161, -82], [44, 169], [236, -100], [181, -255], [-94, -127], [223, -349], [-242, -50], [-157, 345], [-86, -108], [-238, 262], [-112, -15], [-223, 89], [1, 337], [-153, 235], [-75, 900], [136, -201], [9, 886], [160, 582]], [[93002, 48680], [307, -595], [-55, -205], [-267, 533], [15, 267]], [[92286, 49425], [-37, -729], [-251, -394], [-435, -92], [-346, 302], [13, 191], [470, -50], [437, 410], [-43, 370], [192, -8]], [[91956, 50277], [303, -193], [252, -570], [-40, -468], [-70, 475], [-176, 353], [-219, 169], [-50, 234]], [[31357, 62525], [455, -87], [54, -142], [-80, -170], [-435, 57], [-42, 228], [48, 114]], [[94913, 46056], [118, -240], [-56, -154], [-125, 107], [-44, 207], [107, 80]], [[94337, 46438], [132, 85], [193, -217], [38, -229], [-145, -43], [-157, 164], [-61, 240]], [[94666, 47024], [114, -119], [47, -543], [-142, 205], [-19, 457]], [[94053, 47469], [458, -399], [1, -245], [-385, 370], [-74, 274]], [[33272, 58060], [-85, -539], [-204, 216], [-37, 386], [326, -63]], [[83787, 66367], [48, -241], [-68, -941], [-136, -708], [-133, -29], [-149, 725], [36, 360], [242, 734], [160, 100]], [[6742, 63469], [205, -219], [275, -342], [-175, -159], [-202, 235], [-183, 213], [-287, 313], [367, -41]], [[4512, 83553], [108, -171], [-442, -103], [334, 274]], [[12908, 84435], [313, -255], [234, -352], [-31, -196], [-353, 371], [-163, 432]], [[12315, 84877], [310, -141], [276, -621], [-586, 762]], [[7496, 85205], [11, -237], [-319, -447], [-168, 396], [476, 288]], [[12301, 85378], [249, -428], [-444, 201], [195, 227]], [[12379, 85439], [298, -197], [322, -587], [-211, 25], [-409, 759]], [[3863, 86662], [217, -346], [-249, -86], [-430, 401], [462, 31]], [[2313, 88585], [873, -293], [3, -393], [-631, 335], [-245, 351]], [[96374, 43185], [132, -419], [104, -261], [-156, 31], [-75, 263], [-104, 114], [-48, 360], [147, -88]], [[26712, 78420], [548, -134], [-6, -303], [-587, 390], [45, 47]], [[32128, 78941], [294, -276], [362, -69], [-158, -278], [-432, 256], [-66, 367]], [[33194, 78911], [192, -479], [-163, -304], [-142, -68], [-176, 297], [289, 554]], [[32185, 80609], [625, -343], [-101, -165], [-372, 186], [-152, 322]], [[34527, 81397], [132, -264], [-126, -465], [-3, -359], [172, -75], [146, 133], [303, -165], [-125, -389], [187, -46], [-9, -310], [80, -169], [10, -498], [-171, -100], [-196, 301], [-275, -128], [-194, -8], [54, 366], [-932, 12], [-80, 184], [198, 416], [359, 1069], [213, 292], [257, 203]], [[27379, 82581], [256, -343], [-153, -81], [-277, 222], [174, 202]], [[13140, 82904], [235, -48], [260, -414], [232, -385], [-328, 238], [-166, 187], [-233, 422]], [[27295, 88162], [-285, -458], [-318, 129], [304, 342], [299, -13]], [[26253, 89737], [961, -529], [510, -617], [-230, -206], [-406, 136], [-148, 291], [-280, -118], [-247, -539], [-196, 360], [-299, 146], [206, 309], [129, 767]], [[29045, 91417], [131, -317], [-25, -312], [-299, 37], [-251, 286], [0, 376], [113, 179], [331, -249]], [[22491, 92265], [926, -399], [-482, -331], [-599, 55], [155, 675]], [[18279, 94063], [1005, -215], [1040, 213], [65, 234], [481, -333], [74, -533], [295, -926], [378, -402], [102, -516], [-428, -124], [-850, 229], [-1269, -368], [-658, 25], [-290, 366], [-439, 42], [-408, 397], [905, 188], [732, -27], [-539, 238], [-1138, -44], [-222, 240], [634, 204], [-819, 144], [-22, 210], [650, 386], [721, 372]], [[27482, 94373], [764, 9], [462, -466], [-394, 69], [-565, -177], [-267, 565]], [[25956, 94378], [446, -108], [-485, -490], [197, -452], [452, 736], [787, 234], [290, -884], [801, 331], [667, -149], [433, -387], [324, -102], [1142, -613], [346, -492], [125, -314], [209, -571], [511, -331], [606, -426], [-195, -700], [-402, -243], [-375, 427], [-408, 322], [-114, -516], [658, -867], [77, -708], [-498, 55], [-486, 186], [1009, -915], [-224, -128], [-1011, 514], [-793, 618], [-379, 421], [-447, 30], [-352, -39], [-539, 140], [-129, 455], [291, 131], [617, -119], [348, 85], [-142, 430], [589, 560], [-179, 643], [-748, 605], [-983, 628], [-704, -146], [-106, -172], [-1146, 166], [-673, 203], [-392, 836], [292, 769], [693, 347]], [[22269, 94402], [714, -20], [-69, -406], [248, -233], [15, -483], [-599, -370], [-873, 647], [503, 328], [-438, 304], [499, 233]], [[24237, 94511], [708, -106], [-192, -607], [-520, -214], [-102, -496], [-416, 338], [-173, 1041], [695, 44]], [[16227, 94782], [1310, -270], [429, -349], [-1372, -714], [-104, -432], [-685, -234], [-747, 498], [560, 1046], [-273, 336], [882, 119]], [[23779, 95386], [361, -517], [-359, -44], [-497, 293], [-239, 579], [734, -311]], [[22664, 95998], [286, -569], [-182, -376], [-638, -7], [-639, 279], [-179, 553], [538, 204], [814, -84]], [[19814, 96089], [911, -671], [-172, -348], [-782, 9], [-1167, -389], [-390, 65], [-856, 399], [-147, 316], [844, 385], [558, -84], [484, -433], [366, 163], [-125, 286], [476, 302]], [[23545, 96198], [1054, -185], [843, -512], [1298, 13], [1135, -206], [71, -341], [-665, -241], [-2267, 43], [-547, 242], [-297, 513], [-760, 379], [135, 295]], [[17743, 96462], [64, -446], [-1102, -483], [-712, 42], [871, 781], [879, 106]], [[19554, 96808], [128, -339], [-824, -92], [-314, 334], [1010, 97]], [[23271, 97132], [547, -621], [-972, 170], [-288, 480], [713, -29]], [[19065, 97493], [407, -412], [-848, -168], [441, 580]], [[21206, 97538], [1139, -427], [150, -406], [-1369, 201], [80, 632]], [[23681, 99139], [1904, -1311], [-434, -968], [-708, 28], [-1281, 963], [-170, 965], [689, 323]], [[30642, 99713], [1386, -119], [940, -411], [-938, -464], [-2356, -1067], [-555, -75], [17, -595], [-847, -477], [108, -509], [-1914, 89], [-210, -287], [-971, 52], [-293, 440], [848, 54], [-159, 495], [243, 393], [182, 322], [-496, 668], [-853, 687], [2250, 380], [316, 236], [3302, 188]], [[14497, 80889], [115, 142], [394, -305], [277, -85], [408, -527], [123, -415], [-327, 56], [-337, 272], [-354, 449], [-299, 413]], [[95422, 40299], [150, -7], [353, -411], [109, -304], [409, -512], [-47, -211], [-624, 659], [-350, 786]], [[80745, 63447], [155, -128], [-135, -346], [-37, -371], [-269, -333], [-267, 228], [-19, 444], [207, 297], [190, 117], [175, 92]]], "bbox": [-179.9999885408, -89.999999, 179.9999885408, 83.61347077], "transform": { "scale": [0.0036000357711737114, 0.001736152059220592], "translate": [-179.9999885408, -89.999999] } };
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function createBoxTextImportWizard(file) {
  var modal_box = make_dialog_container('box_text_import_wizard', i18next.t('app_page.box_text_import.title'), 'dialog');

  if (!file) {
    file = new File(['id;val1;val2\r\n"foo";2;3\r\n"bar";5;6\r\n'], 'filename.csv');
  }

  var box_content = d3.select('#box_text_import_wizard').select('.modal-body');
  var a = new TextImportWizard(box_content.node(), file);
  var deferred = Promise.pending(),
      container = document.getElementById('box_text_import_wizard'),
      dialog = container.querySelector('.modal-dialog');
  dialog.style.width = undefined;
  dialog.style.maxWidth = '620px';
  dialog.style.minWidth = '380px';

  var clean_up_box = function clean_up_box() {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };
  var fn_cb = function fn_cb(evt) {
    helper_esc_key_twbs_cb(evt, _onclose);
  };
  var _onclose = function _onclose() {
    clean_up_box();
    deferred.resolve(false);
  };
  container.querySelector('.btn_cancel').onclick = _onclose;
  container.querySelector('#xclose').onclick = _onclose;
  container.querySelector('.btn_ok').onclick = function () {
    clean_up_box();
    deferred.resolve([a.parsed_data, a.valid]);
  };
  document.addEventListener('keydown', fn_cb);
  overlay_under_modal.display();

  return deferred.promise;
}

// let encoding = jschardet.detect(data);
// if(encoding.encoding != "utf-8"
//         || encoding.confidence){
//     console.log(encoding);
//    //  Todo : do something in order to get a correct encoding
// }

function firstGuessSeparator(line) {
  if (line.indexOf('\t') > -1) {
    return 'tab';
  } else if (line.indexOf(';') > -1) {
    return 'semi-collon';
  }
  return 'comma';
}

var TextImportWizard = function () {
  function TextImportWizard(parent_element, file_txt) {
    _classCallCheck(this, TextImportWizard);

    if (!parent_element) {
      parent_element = document.body;
    }
    var self = this;
    self.delim_char = { tab: '\t', comma: ',', 'semi-collon': ';', space: ' ' };
    var handle_change_delimiter = function handle_change_delimiter() {
      var buttons = document.getElementsByName('txtwzrd_delim_char'),
          n_buttons = buttons.length,
          delim = void 0;
      for (var i = 0; i < n_buttons; i++) {
        if (buttons[i].checked) {
          delim = self.delim_char[buttons[i].value];
        }
      }
      if (delim) {
        self.change_delimiter(delim);
      }
    };
    var html_content = '<div>' + '<p style="font-weight: bold;"><span>Import</span><span style="float: right;" id="txtwzrd_filename"></span></p>' + '<p><span>Encodage</span><select id="txtwzrd_encoding" style="position: absolute; left: 200px;"></select></p>' + '<p><span>A partir de la ligne</span><input style="position: absolute; left: 200px;width: 60px;" type="number" value="1" min="1" step="1" id="txtwzrd_from_line"/></p>' + '</div>' + '<div>' + '<p style="font-weight: bold;"><span>Délimiteur</span></p>' +
    // "<p><input type=\"radio\" name=\"txtwzrd_radio_delim\" value=\"fixed\">Taille de colonne fixe</input><input type=\"radio\" name=\"txtwzrd_radio_delim\" value=\"char\">Caractère</input></p>" +
    '<p><input type="radio" name="txtwzrd_delim_char" value="tab" style="margin-left: 10px;">Tabulation</input>' + '<input type="radio" name="txtwzrd_delim_char" value="comma" style="margin-left: 10px;">Virgule</input>' + '<input type="radio" name="txtwzrd_delim_char" value="semi-collon" style="margin-left: 10px;">Point-virgule</input>' + '<input type="radio" name="txtwzrd_delim_char" value="space" style="margin-left: 10px;">Espace</input></p>' + "<p><span>Séparateur de texte</span><select id=\"txtwzrd_txt_sep\" style=\"position: absolute; left: 200px;\"><option value=\"&quot;\">&quot;</option><option value=\"'\">'</option></select></p>" + '<p><span>Séparateur des décimales</span><select id="txtwzrd_decimal_sep" style="position: absolute; left: 200px;"><option value=".">.</option><option value=",">,</option></select></p>' + '</div>' + '<p style="font-weight: bold;clear: both;"><span>Table</span><span id="valid_message" style="float: right; color: red; font-weight: bold;"></span></p>' + '<div style="max-height: 160px; overflow-y: scroll; margin-top: 12px;">' + '<table id="txtwzr_table" style="font-size: 14px; margin: 0 5px 0 5px;"><thead></thead><tbody></tbody>' + '</div>';

    var div_content = document.createElement('div');
    div_content.setAttribute('class', '.txtwzrd_box_content');
    div_content.style = 'minWidth: 400px; maxWidth: 600px; minHeight: 400px; maxHeight: 600px';
    div_content.innerHTML = html_content;
    parent_element.appendChild(div_content);
    parent_element.querySelector('#txtwzrd_filename').innerHTML = file_txt.name;
    parent_element.querySelector('#txtwzrd_from_line').onchange = function () {
      var val = +this.value;
      if (isNaN(val) || val < 1 || (val | 0) != val) {
        this.value = self.from_line;
      } else {
        self.from_line = val;
        self.parse_data();
        self.update_table();
      }
    };
    parent_element.querySelector('#txtwzrd_txt_sep').onchange = function () {
      self.text_separator = this.value;
      self.parse_data();
      self.update_table();
    };
    Array.prototype.forEach.call(document.getElementsByName('txtwzrd_delim_char'), function (el) {
      el.onclick = handle_change_delimiter;
    });
    this.content = div_content;
    this.table = div_content.querySelector('table');
    this.file = file_txt;
    this.readed_text = null;
    this.encoding = document.characterSet;
    this.delimiter = undefined;
    this.from_line = 1;
    this.line_separator = undefined;
    this.text_separator = '"';
    this.parsed_data = undefined;
    this.valid = undefined;
    this.valid_message;
    self.add_encodage_to_selection([self.encoding]);
    self.read_file_to_text({ first_read: true, update: true });
    return this;
  }

  _createClass(TextImportWizard, [{
    key: 'add_encodage_to_selection',
    value: function add_encodage_to_selection(encodage) {
      var select = this.content.querySelector('#txtwzrd_encoding');
      if (typeof encodage === 'string') {
        encodage = [encodage];
      }
      for (var i = 0; i < encodage.length; i++) {
        var o = document.createElement('option');
        o.value = encodage[i];
        o.innerText = encodage[i];
        select.append(o);
      }
    }
  }, {
    key: 'set_first_guess_delimiter',
    value: function set_first_guess_delimiter() {
      var self = this;
      var delim = firstGuessSeparator(self.readed_text.split(self.line_separator)[0]);
      self.delimiter = self.delim_char[delim];
      Array.prototype.forEach.call(document.getElementsByName('txtwzrd_delim_char'), function (el) {
        if (el.value == delim) {
          el.checked = true;
        }
      });
    }
  }, {
    key: 'set_line_separator',
    value: function set_line_separator() {
      this.line_separator = this.readed_text.indexOf('\r\n') > -1 ? '\r\n' : '\n';
    }
  }, {
    key: 'read_file_to_text',
    value: function read_file_to_text() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var self = this;
      var reader = new FileReader();
      reader.onloadend = function () {
        self.readed_text = reader.result;
        if (options.first_read == true) {
          self.set_line_separator();
          self.set_first_guess_delimiter();
        }
        if (options.update == true) {
          self.parse_data();
          self.update_table();
        }
      };
      reader.readAsText(self.file, self.encoding);
    }
  }, {
    key: 'change_delimiter',
    value: function change_delimiter(new_delim) {
      var self = this;
      self.delimiter = new_delim;
      self.parse_data();
      self.update_table();
    }
  }, {
    key: 'parse_data',
    value: function parse_data() {
      var strip_text_separator = function strip_text_separator(line) {
        var len = line.length;
        for (var i = 0; i < len; i++) {
          var val = line[i];
          if (val.startsWith(self.text_separator) && val.endsWith(self.text_separator)) {
            line[i] = val.slice(1, -1);
          }
        }
      };
      var self = this,
          lines = self.readed_text.split(self.line_separator),
          fields = lines[self.from_line - 1].split(self.delimiter),
          tmp_nb_fields = fields.length,
          nb_ft = void 0;

      strip_text_separator(fields);

      lines = lines.slice(self.from_line).filter(function (line) {
        return line != '';
      });
      nb_ft = lines.length;
      self.parsed_data = [];
      self.valid = true;
      for (var i = 0; i < nb_ft; i++) {
        var values = lines[i].split(self.delimiter);
        strip_text_separator(values);
        var ft = {};
        if (values.length != tmp_nb_fields) {
          self.valid = false;
          self.valid_message = 'Nombre de colonne différent (en-tetes / valeurs)';
        }
        for (var j = 0; j < tmp_nb_fields; j++) {
          ft[fields[j] || 'Field' + j] = values[j];
        }
        self.parsed_data.push(ft);
      }
    }
  }, {
    key: 'update_table',
    value: function update_table() {
      var self = this;
      var doc = document;

      self.table.parentElement.scrollTop = 0;
      self.table.innerHTML = '<thead></thead><tbody></tbody>';

      var field_names = Object.getOwnPropertyNames(self.parsed_data[0]);
      var headers = self.table.querySelector('thead');
      var tbody = self.table.querySelector('tbody');
      var length_table = self.parsed_data.length < 10 ? self.parsed_data.length : 10;
      var headers_row = doc.createElement('tr');

      for (var i = 0; i < field_names.length; i++) {
        var cell = doc.createElement('th');
        cell.innerHTML = field_names[i];
        headers_row.appendChild(cell);
      }
      headers.append(headers_row);

      for (var _i = 0; _i < length_table; _i++) {
        var row = doc.createElement('tr'),
            values = self.parsed_data[_i],
            fields = Object.getOwnPropertyNames(values);
        for (var j = 0; j < fields.length; j++) {
          var _cell = doc.createElement('td');
          _cell.innerHTML = values[fields[j]];
          row.appendChild(_cell);
        }
        tbody.appendChild(row);
      }
      self.content.querySelector('#valid_message').innerHTML = self.valid === false ? self.valid_message : '';
    }
  }]);

  return TextImportWizard;
}();
'use strict';

/**
* Function triggered when the user click on the "zoom by tracing a rectangle"
* button.
* If the feature is already active, it disable it. Otherwise it enable it.
*
* @return {void}
*
*/
var handleZoomRect = function handleZoomRect() {
  var b = map.select('.brush');
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
var makeZoomRect = function makeZoomRect() {
  if (!proj.invert) return;
  function idled() {
    idleTimeout = null;
  }
  function brushended() {
    var s = d3.event.selection;
    if (!s) {
      if (!idleTimeout) {
        idleTimeout = setTimeout(idled, idleDelay);
        return idleTimeout;
      }
    } else {
      var x_min = s[0][0],
          x_max = s[1][0];
      var y_min = s[1][1],
          y_max = s[0][1];
      var transform = d3.zoomTransform(svg_map),
          z_trans = [transform.x, transform.y],
          z_scale = transform.k;

      var pt1 = proj.invert([(x_min - z_trans[0]) / z_scale, (y_min - z_trans[1]) / z_scale]),
          pt2 = proj.invert([(x_max - z_trans[0]) / z_scale, (y_max - z_trans[1]) / z_scale]);
      var path_bounds = path.bounds({ type: 'MultiPoint', coordinates: [pt1, pt2] });
      // Todo : use these two points to make zoom on them
      map.select('.brush').call(brush.move, null);

      var zoom_scale = 0.95 / Math.max((path_bounds[1][0] - path_bounds[0][0]) / w, (path_bounds[1][1] - path_bounds[0][1]) / h);
      var zoom_translate = [(w - zoom_scale * (path_bounds[1][0] + path_bounds[0][0])) / 2, (h - zoom_scale * (path_bounds[1][1] + path_bounds[0][1])) / 2];
      svg_map.__zoom.k = zoom_scale;
      svg_map.__zoom.x = zoom_translate[0];
      svg_map.__zoom.y = zoom_translate[1];
      zoom_without_redraw();
    }
  }

  var brush = d3.brush().on('end', brushended);
  var idleTimeout = void 0,
      idleDelay = 350;
  map.append('g').attr('class', 'brush').call(brush);
};

