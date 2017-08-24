'use strict';

/*
* Memoization functions (naive LRU implementation)
*
*/
Function.prototype.memoized = function (max_size = 25) {
  this._memo = this._memo || { values: new Map(), stack: [], max_size: max_size };
  const key = JSON.stringify(Array.prototype.slice.call(arguments));
  let cache_value = this._memo.values.get(key);
  if (cache_value !== undefined) {
    return JSON.parse(cache_value);
  }
  cache_value = this.apply(this, arguments);
  this._memo.values.set(key, JSON.stringify(cache_value));
  this._memo.stack.push(key);
  if (this._memo.stack.length >= this._memo.max_size) {
    const old_key = this._memo.stack.shift();
    this._memo.values.delete(old_key);
  }
  return cache_value;
};

Function.prototype.memoize = function () {
  const fn = this;
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
  window.addEventListener('unload', () => {
    const layer_names = Object.getOwnPropertyNames(current_layers).filter((name) => {
      if (!(current_layers[name].hasOwnProperty('key_name'))) {
        return 0;
      } else if (current_layers[name].targeted) {
        return 0;
      } else if (current_layers[name].renderer
            && (current_layers[name].renderer.indexOf('PropSymbols') > -1
              || current_layers[name].renderer.indexOf('Dorling') > -1
              || current_layers[name].renderer.indexOf('Choropleth') > -1
              || current_layers[name].renderer.indexOf('Categorical') > -1)) {
        return 0;
      }
      return 1;
    });
    if (layer_names.length) {
      const formToSend = new FormData();
      layer_names.forEach((name) => {
        formToSend.append('layer_name', current_layers[name].key_name);
      });
      navigator.sendBeacon('/layers/delete', formToSend);
    }
  }, false);
  const bg = document.createElement('div');
  bg.id = 'overlay';
  bg.style.display = 'none';
  // bg.innerHTML = '<span class="i18n" style="color: white; z-index: 2;margin-top:185px;display: inline-block;" data-i18n="[html]app_page.common.loading_results"></span>' +
  //                '<span style="color: white; z-index: 2;">...<br></span>' +
  //                '<span class="i18n" style="color: white; z-index: 2;display: inline-block;" data-i18n="[html]app_page.common.long_computation"></span><br>' +
  //                '<div class="load-wrapp" style="left: calc(50% - 60px);position: absolute;top: 50px;"><div class="load-1"><div class="line"></div>' +
  //                '<div class="line"></div><div class="line"></div></div></div>';
  bg.innerHTML = `
<img src="static/img/logo_magrit.png" alt="Magrit" style="left: 15px;position: absolute;" width="auto" height="26">
<span class="i18n" style="z-index: 2; margin-top:85px; display: inline-block;" data-i18n="[html]app_page.common.loading_results"></span>
<span style="z-index: 2;">...<br></span>
<div class="spinner">
  <div class="rect1"></div>
  <div class="rect2"></div>
  <div class="rect3"></div>
  <div class="rect4"></div>
  <div class="rect5"></div>
</div>
<span class="i18n" style="z-index: 2;display: inline-block; margin-bottom: 20px;" data-i18n="[html]app_page.common.long_computation"></span><br>`;
  const btn = document.createElement('button');
  btn.style.fontSize = '13px';
  btn.style.background = '#4b9cdb';
  btn.style.border = '1px solid #298cda';
  btn.style.fontWeight = 'bold';
  btn.className = 'button_st3 i18n';
  btn.setAttribute('data-i18n', '[html]app_page.common.cancel');
  bg.appendChild(btn);
  document.body.appendChild(bg);

  btn.onclick = () => {
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

  const bg_drop = document.createElement('div');
  bg_drop.className = 'overlay_drop';
  bg_drop.id = 'overlay_drop';
  bg_drop.style.background = 'black';
  bg_drop.style.opacity = '0.6';
  bg_drop.style.display = 'none';
  bg_drop.style.padding = '10px';
  const inner_div = document.createElement('div');
  inner_div.style.border = 'dashed 2px white';
  inner_div.style.margin = '10px';
  inner_div.style.background = 'rgba(0, 0, 0, 0.33)';
  inner_div.style.borderRadius = '1%';
  inner_div.className = 'overlay_drop';
  const inner_p = document.createElement('p');
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

  const proj_options = d3.select('.header_options_projection')
    .append('div')
    .attr('id', 'const_options_projection')
    .style('display', 'inline-flex');

  const proj_select2 = proj_options.append('div')
    .attrs({ class: 'styled-select' })
    .insert('select')
    .attrs({ class: 'i18n', id: 'form_projection2' })
    .styles({ width: 'calc(100% + 20px)' })
    .on('change', function () {
      const tmp = this.querySelector('[value="last_projection"]');
      let val = this.value;
      if (val === 'more') {
        this.value = (tmp && current_proj_name === tmp.name) ? 'last_projection' : current_proj_name;
        createBoxCustomProjection();
        return;
      } else if (val === 'proj4') {
        this.value = (tmp && current_proj_name === tmp.name) ? 'last_projection' : current_proj_name;
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

  for (let i = 0; i < shortListContent.length; i++) {
    const option = shortListContent[i];
    proj_select2.append('option')
      .attrs({ class: 'i18n', value: option, 'data-i18n': `app_page.projection_name.${option}` })
      .text(i18next.t(`app_page.projection_name.${option}`));
  }
  proj_select2.node().value = 'NaturalEarth2';

  const const_options = d3.select('.header_options_right')
    .append('div')
    .attr('id', 'const_options')
    .style('display', 'inline');

  const_options.append('button')
    .attrs({ class: 'const_buttons i18n', id: 'new_project', 'data-i18n': '[tooltip-title]app_page.tooltips.new_project', 'data-placement': 'bottom' })
    .styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' })
    .html('<img src="static/img/File_font_awesome_blank.png" width="25" height="auto" alt="Load project file"/>')
    .on('click', () => {
      window.localStorage.removeItem('magrit_project');
      window.removeEventListener('beforeunload', beforeUnloadWindow);
      location.reload();
    });

  const_options.append('button')
    .attrs({ class: 'const_buttons i18n', id: 'load_project', 'data-i18n': '[tooltip-title]app_page.tooltips.load_project_file', 'data-placement': 'bottom' })
    .styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' })
    .html('<img src="static/img/Folder_open_alt_font_awesome.png" width="25" height="auto" alt="Load project file"/>')
    .on('click', load_map_template);

  const_options.append('button')
    .attrs({ class: 'const_buttons i18n', id: 'save_file_button', 'data-i18n': '[tooltip-title]app_page.tooltips.save_file', 'data-placement': 'bottom' })
    .styles({ cursor: 'pointer', background: 'transparent', margin: 'auto' })
    .html('<img src="static/img/Breezeicons-actions-22-document-save-blank.png" width="25" height="auto" alt="Save project to disk"/>')
    .on('click', save_map_template);

  const_options.append('button')
    .attrs({ class: 'const_buttons i18n', id: 'documentation_link', 'data-i18n': '[tooltip-title]app_page.tooltips.documentation', 'data-placement': 'bottom' })
    .styles({ cursor: 'pointer', background: 'transparent', 'margin-top': '5px' })
    .html('<img src="static/img/Documents_icon_-_noun_project_5020_white.png" width="20" height="auto" alt="Documentation"/>')
    .on('click', () => {
      window.open('static/book/index.html', 'DocWindow', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
    });

  const_options.append('button')
    .attrs({ id: 'help_btn',
      class: 'const_buttons i18n',
      'data-i18n': '[tooltip-title]app_page.help_box.tooltip_btn',
      'data-placement': 'bottom' })
    .styles({ cursor: 'pointer', background: 'transparent' })
    .html('<img src="static/img/High-contrast-help-browser_blank.png" width="20" height="20" alt="export_load_preferences" style="margin-bottom:3px;"/>')
    .on('click', () => {
      if (document.getElementById('menu_lang')) document.getElementById('menu_lang').remove();
      const click_func = (window_name, target_url) => {
        window.open(target_url, window_name, 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
      };
      const box_content = '<div class="about_content">' +
        '<p style="font-size: 0.8em; margin-bottom:auto;"><span>' +
        i18next.t('app_page.help_box.version', { version: _app.version }) + '</span></p>' +
        '<p><b>' + i18next.t('app_page.help_box.useful_links') + '</b></p>' +
        '<p><button class="swal2-styled swal2_blue btn_doc">' +
        i18next.t('app_page.help_box.carnet_hypotheses') + '</button></p>' +
        '<p><button class="swal2-styled swal2_blue btn_contact">' +
        i18next.t('app_page.help_box.contact') + '</button></p>' +
        '<p><button class="swal2-styled swal2_blue btn_gh">' +
        i18next.t('app_page.help_box.gh_link') + '</button></p>' +
        '<p style="font-size: 0.8em; margin:auto;"><span>' +
        i18next.t('app_page.help_box.credits') + '</span></p></div>';
      swal({
        title: i18next.t('app_page.help_box.title'),
        html: box_content,
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: i18next.t('app_page.common.close'),
        animation: 'slide-from-top',
        onOpen: () => {
          const content = document.getElementsByClassName('about_content')[0];
          const credit_link = content.querySelector('#credit_link');
          credit_link.style.fontWeight = 'bold';
          credit_link.style.cursor = 'pointer';
          credit_link.color = '#000';
          credit_link.onclick = () => {
            window.open('http://riate.cnrs.fr', 'RiatePage', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
          };
          content.querySelector('.btn_doc').onclick = () => {
            window.open('http://magrit.hypotheses.org/', 'Carnet hypotheses', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
          };
          content.querySelector('.btn_contact').onclick = () => {
            window.open('/contact', 'ContactWindow', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
          };
          content.querySelector('.btn_gh').onclick = () => {
            window.open('https://www.github.com/riatelab/magrit', 'GitHubPage', 'toolbar=yes,menubar=yes,resizable=yes,scrollbars=yes,status=yes').focus();
          };
        },
      }).then(inputValue => null,
        dismissValue => null);
    });

  const_options.append('button')
    .attrs({ id: 'current_app_lang', class: 'const_buttons' })
    .styles({ color: 'white',
      cursor: 'pointer',
      'font-size': '14px',
      'vertical-align': 'super',
      background: 'transparent',
      'font-weight': 'bold' })
    .html(i18next.language)
    .on('click', () => {
      if (document.getElementById('menu_lang')) {
        document.getElementById('menu_lang').remove();
      } else {
        const current_lang = i18next.language;
        const other_langs = current_lang === 'en' ? ['es', 'fr'] : current_lang === 'fr' ? ['en', 'es'] : ['en', 'fr'];
        const actions = [
          { name: current_lang, callback: change_lang },
          { name: other_langs[0], callback: change_lang },
          { name: other_langs[1], callback: change_lang },
        ];
        const menu = document.createElement('div');
        menu.style.top = '40px';
        menu.style.right = '0px';
        menu.className = 'context-menu';
        menu.id = 'menu_lang';
        menu.style.minWidth = '30px';
        menu.style.width = '50px';
        menu.style.background = '#000';
        const list_elems = document.createElement('ul');
        menu.appendChild(list_elems);
        for (let i = 0; i < actions.length; i++) {
          const item = document.createElement('li'),
            name = document.createElement('span');
          list_elems.appendChild(item);
          item.setAttribute('data-index', i);
          item.style.textAlign = 'right';
          item.style.paddingRight = '16px';
          name.className = 'context-menu-item-name';
          name.style.color = 'white';
          name.textContent = actions[i].name;
          item.appendChild(name);
          item.onclick = () => {
            actions[i].callback();
            menu.remove();
          };
        }
        document.querySelector('body').appendChild(menu);
      }
    });

  const menu = d3.select('#menu'),
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

  const section1 = accordion1.append('div')
    .attr('id', 'section1')
    .attr('class', 'i18n')
    .attr('data-i18n', '[tooltip-title]app_page.tooltips.section1')
    .attr('data-placement', 'right');
  window.section2_pre = accordion2_pre.append('div').attr('id', 'section2_pre');
  window.section2 = accordion2.append('div').attr('id', 'section2');
  accordion3.append('div').attrs({ id: 'section3' });
  accordion4.append('div').attr('id', 'section4');
  accordion5.append('div').attr('id', 'section5');

  const dv1 = section1.append('div');
  const dv11 = dv1.append('div').style('width', 'auto');

  dv11.append('img')
    .attrs({ id: 'img_in_geom', class: 'user_panel', src: 'static/img/b/addgeom.png', width: '26', height: '26', alt: 'Geometry layer' })
    .style('cursor', 'pointer')
    .on('click', click_button_add_layer);

  dv11.append('p')
    .attrs({ id: 'input_geom', class: 'user_panel i18n' })
    .styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' })
    .attr('data-i18n', '[html]app_page.section1.add_geom')
    .on('click', click_button_add_layer);

  const dv12 = dv1.append('div');
  dv12.append('img')
    .attrs({ id: 'img_data_ext', class: 'user_panel', src: 'static/img/b/addtabular.png', width: '26', height: '26', alt: 'Additional dataset' })
    .style('cursor', 'pointer')
    .on('click', click_button_add_layer);

  dv12.append('p')
    .attrs({ id: 'data_ext', class: 'user_panel i18n', 'data-i18n': '[html]app_page.section1.add_ext_dataset' })
    .styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' })
    .on('click', click_button_add_layer);

  const div_sample = dv1.append('div').attr('id', 'sample_zone');
  div_sample.append('img')
    .attrs({ id: 'sample_button', class: 'user_panel', src: 'static/img/b/addsample.png', width: '26', height: '26', alt: 'Sample layers' })
    .style('cursor', 'pointer')
    .on('click', add_sample_layer);

  div_sample.append('span')
    .attrs({ id: 'sample_link', class: 'user_panel i18n' })
    .styles({ display: 'inline', cursor: 'pointer', 'margin-left': '5px', 'vertical-align': 'super', 'font-weight': 'bold' })
    .attr('data-i18n', '[html]app_page.section1.add_sample_data')
    .on('click', add_sample_layer);

  dv1.append('p')
    .attr('id', 'join_section')
    .styles({ 'text-align': 'center', 'margin-top': '2px' })
    .html('');

  dv1.append('p')
    .styles({ 'text-align': 'center', margin: '5px' })
    .insert('button')
    .attrs({
      id: 'btn_type_fields',
      class: 'i18n',
      'data-i18n': '[html]app_page.box_type_fields.title',
      disabled: true })
    .styles({
      cursor: 'pointer',
      'border-radius': '4px',
      border: '1px solid lightgrey',
      padding: '3.5px' })
    .html(i18next.t('app_page.box_type_fields.title'))
    .on('click', () => {
      const layer_name = Object.getOwnPropertyNames(user_data)[0];
      make_box_type_fields(layer_name);
    });

  make_ico_choice();

  const section3 = d3.select('#section3');

  window.layer_list = section3.append('div')
    .attrs({ class: 'i18n',
      'data-i18n': '[tooltip-title]app_page.tooltips.section3',
      'data-placement': 'right' })
    .append('ul').attrs({ id: 'sortable', class: 'layer_list' });
  new Sortable(document.getElementById('sortable'), {
    animation: 100,
    onUpdate: function (a) {
      // Set the layer order on the map in concordance with the user changes
      // in the layer manager with a pretty rusty 'sorting' algorythm :
      const desired_order = [],
        actual_order = [],
        layers = svg_map.querySelectorAll('.layer');
      let at_end = null;
      if (document.getElementById('info_features').className === 'active') {
        displayInfoOnMove();
        at_end = true;
      }

      for (let i = 0, len_i = a.target.childNodes.length; i < len_i; i++) {
        const n = a.target.childNodes[i].getAttribute('layer_name');
        desired_order[i] = _app.layer_to_id.get(n);
        actual_order[i] = layers[i].id;
      }
      for (let i = 0, len = desired_order.length; i < len; i++) {
        const lyr1 = document.getElementById(desired_order[i]),
          lyr2 = document.getElementById(desired_order[i + 1]) || document.getElementById(desired_order[i]);
        svg_map.insertBefore(lyr2, lyr1);
      }
      if (at_end) displayInfoOnMove();
    },
    onStart: (event) => {
      document.body.classList.add('no-drop');
    },
    onEnd: (event) => {
      document.body.classList.remove('no-drop');
    },
  });

  const dv3 = section3.append('div')
    .style('padding-top', '10px').html('');

  dv3.append('img')
    .attrs({ src: 'static/img/b/addsample_t.png',
      class: 'i18n',
      'data-i18n': '[tooltip-title]app_page.tooltips.section3_add_layout_sample',
      'data-placement': 'right' })
    .styles({ cursor: 'pointer', margin: '2.5px', float: 'right', 'border-radius': '10%' })
    .on('click', add_layout_layers);
  dv3.append('img')
    .attrs({ src: 'static/img/b/addgeom_t.png',
      id: 'input_layout_geom',
      class: 'i18n',
      'data-i18n': '[tooltip-title]app_page.tooltips.section3_add_layout',
      'data-placement': 'right' })
    .styles({ cursor: 'pointer', margin: '2.5px', float: 'right', 'border-radius': '10%' })
    .on('click', click_button_add_layer);

  const section4 = d3.select('#section4');
  const dv4 = section4.append('div')
    .attr('class', 'form-item')
    .style('margin', 'auto')
    .append('ul')
    .styles({ 'list-style': 'outside none none',
      display: 'inline-block',
      padding: '0px',
      width: '100%',
      'margin-top': '0px' });

  const e = dv4.append('li').styles({ margin: '1px', padding: '4px', 'text-align': 'center' });
  e.append('input')
    .attrs({ id: 'title',
      class: 'list_elem_section4 i18n',
      placeholder: '',
      'data-i18n': '[placeholder]app_page.section4.map_title' })
    .styles({ margin: '0px 0px 0px 3px', width: '160px' })
    .on('keyup', function () { handle_title(this.value); });
  e.append('span')
    .styles({ display: 'inline', top: '4px', cursor: 'pointer', 'vertical-align': 'sub' })
    .html(sys_run_button.replace('submit', 'Title properties'))
    .on('click', handle_title_properties);

  const f = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  f.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.background_color');
  f.append('input')
    .styles({ position: 'absolute', right: '20px', width: '60px', 'margin-left': '15px' })
    .attrs({ type: 'color', id: 'bg_color', value: '#ffffff', class: 'list_elem_section4 m_elem_right' })
    .on('change', function () { handle_bg_color(this.value); });

  const a1 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  a1.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.map_width');
  a1.append('input')
    .attrs({ id: 'input-width', type: 'number', value: w, class: 'list_elem_section4 m_elem_right' })
    .on('change', function () {
      const new_width = +this.value;
      if (new_width === 0 || isNaN(new_width)) {
        this.value = w;
        return;
      }
      const ratio_type = document.getElementById('map_ratio_select').value;
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


  const a2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  a2.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.map_height');
  a2.append('input')
    .attrs({ id: 'input-height', type: 'number', value: h, class: 'm_elem_right list_elem_section4' })
    .on('change', function () {
      const new_height = +this.value;
      if (new_height === 0 || isNaN(new_height)) {
        this.value = h;
        return;
      }
      const ratio_type = document.getElementById('map_ratio_select').value;
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

  const b = dv4.append('li').styles({ margin: '1px', padding: '4px 0' });
  b.append('p').attr('class', 'list_elem_section4 i18n')
    .style('padding', '4px')
    .attr('data-i18n', '[html]app_page.section4.map_ratio');
  const ratio_select = b.append('select')
    .attrs({ class: 'list_elem_section4 i18n m_elem_right', id: 'map_ratio_select' });

  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_user').attr('value', 'ratio_user');
  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_landscape').attr('value', 'landscape');
  ratio_select.append('option').text('').attr('data-i18n', '[html]app_page.section4.ratio_portait').attr('value', 'portrait');
  ratio_select.on('change', function () {
    const map_xy = get_map_xy0();
    const dispo_w = document.innerWidth - map_xy.x - 1;
    const dispo_h = document.innerHeight - map_xy.y - 1;
    const diff_w = dispo_w - w;
    const diff_h = dispo_h - h;
    if (this.value === 'portrait') {
      if (round_value(w / h, 1) === 1.4) {
        const tmp = h;
        h = w;
        w = tmp;
      } else if (diff_h >= diff_w) {
        w = round_value(h * 0.70707, 0);
      } else {
        h = round_value(w / 0.70707, 0);
      }
    } else if (this.value === 'landscape') {
      if (round_value(h / w, 1) === 1.4) {
        const tmp = h;
        h = w;
        w = tmp;
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
  const zoom_prop = svg_map.__zoom;

  const d2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  d2.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.resize_fit');
  d2.append('button')
    .styles({ margin: 0, padding: 0 })
    .attrs({
      id: 'resize_fit',
      class: 'm_elem_right list_elem_section4 button_st4 i18n',
      'data-i18n': '[html]app_page.common.ok' })
    .on('click', () => {
      document.getElementById('btn_s4').click();
      window.scrollTo(0, 0);
      w = Math.round(window.innerWidth - 361);
      h = window.innerHeight - 55;
      canvas_mod_size([w, h]);
      document.getElementById('map_ratio_select').value = 'ratio_user';
    });

  const c = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  c.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.map_center_menu')
    .style('cursor', 'pointer');
  c.append('span').attr('id', 'map_center_menu_ico')
    .style('display', 'inline-table')
    .style('cursor', 'pointer');
  c.on('click', () => {
    const sections = document.getElementsByClassName('to_hide');
    let arg;
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

  const c1 = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  c1.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.map_center_x');
  c1.append('input')
    .style('width', '80px')
    .attrs({
      id: 'input-center-x',
      class: 'm_elem_right',
      type: 'number',
      value: round_value(zoom_prop.x, 2),
      step: 'any' })
    .on('change', function () {
      svg_map.__zoom.x = +this.value;
      zoom_without_redraw();
    });

  const c2 = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  c2.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.map_center_y');

  c2.append('input')
    .attrs({ id: 'input-center-y',
      class: 'list_elem_section4 m_elem_right',
      type: 'number',
      value: round_value(zoom_prop.y, 2),
      step: 'any' })
    .style('width', '80px')
    .on('change', function () {
      svg_map.__zoom.y = +this.value;
      zoom_without_redraw();
    });

  const d = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  d.append('p').attr('class', 'list_elem_section4 i18n')
          .attr('data-i18n', '[html]app_page.section4.map_scale_k');
  d.append('input')
    .attrs({ id: 'input-scale-k',
      class: 'list_elem_section4 m_elem_right',
      type: 'number',
      value: round_value(zoom_prop.k * proj.scale(), 2),
      step: 'any' })
    .style('width', '80px')
    .on('change', function () {
      svg_map.__zoom.k = +this.value / proj.scale();
      zoom_without_redraw();
    });

  const g = dv4.append('li').style('display', 'none').attr('class', 'to_hide');
  g.append('p').attr('class', 'list_elem_section4 i18n')
          .attr('data-i18n', '[html]app_page.section4.canvas_rotation');

  g.append('span')
      .style('float', 'right')
      .html('°');

  g.append('input')
    .attrs({ id: 'canvas_rotation_value_txt',
      class: 'without_spinner',
      type: 'number',
      value: 0,
      min: 0,
      max: 360,
      step: 'any' })
    .styles({ width: '30px', 'margin-left': '10px', float: 'right', 'font-size': '11.5px' })
    .on('change', function () {
      const val = +this.value,
        old_value = document.getElementById('form_rotate').value;
      if (isNaN(val) || val < -361) {
        this.value = old_value;
        return;
      } else if (val < 0 && val > -361) {
        this.value = 360 + val;
      } else if (val > 360) {
        this.value = 360;
      } else { // Should remove trailing zeros (right/left) if any :
        this.value = +this.value;
      }
      rotate_global(this.value);
      document.getElementById('form_rotate').value = this.value;
    });

  g.append('input')
    .attrs({ type: 'range', id: 'form_rotate', min: 0, max: 360, step: 1 })
    .styles({ width: '80px', margin: '0px 10px 5px 15px', float: 'right' })
    .on('input', function () {
      rotate_global(this.value);
      document.getElementById('canvas_rotation_value_txt').value = this.value;
    });

  const g2 = dv4.append('li').styles({ margin: '1px', padding: '4px' });
  g2.append('p').attr('class', 'list_elem_section4 i18n')
    .attr('data-i18n', '[html]app_page.section4.autoalign_features');
  g2.append('input')
    .styles({ margin: 0, padding: 0 })
    .attrs({ id: 'autoalign_features',
      type: 'checkbox',
      class: 'm_elem_right list_elem_section4 i18n' })
    .on('change', function () {
      _app.autoalign_features = this.checked;
    });

  const _i = dv4.append('li').styles({ 'text-align': 'center' });
  _i.insert('p').styles({ clear: 'both', display: 'block', margin: 0 }).attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section4.layout_features' });
  const p1 = _i.insert('p').style('display', 'inline-block');
  p1.insert('span')
    .insert('img')
    .attrs({ id: 'btn_arrow', src: 'static/img/layout_icons/arrow-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.arrow' })
    .on('click', () => add_layout_feature('arrow'));
  p1.insert('span')
    .insert('img')
    .attrs({ id: 'btn_text_annot', src: 'static/img/layout_icons/text-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.text_annot' })
    .on('click', () => add_layout_feature('text_annot'));
  if (!window.isIE) {
    p1.insert('span')
      .insert('img')
      .attrs({ id: 'btn_symbol', src: 'static/img/layout_icons/symbols-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.symbol' })
      .on('click', () => add_layout_feature('symbol'));
  }
  p1.insert('span')
    .insert('img')
    .attrs({ id: 'btn_rectangle', src: 'static/img/layout_icons/rect-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.rectangle' })
    .on('click', () => add_layout_feature('rectangle'));
  p1.insert('span')
    .insert('img')
    .attrs({ id: 'btn_ellipse', src: 'static/img/layout_icons/ellipse-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.ellipse' })
    .on('click', () => add_layout_feature('ellipse'));

  const p2 = _i.insert('p').style('display', 'inline-block');
  p2.insert('span')
    .insert('img')
    .attrs({ id: 'btn_graticule', src: 'static/img/layout_icons/graticule-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.graticule' })
    .on('click', () => add_layout_feature('graticule'));
  p2.insert('span')
    .insert('img')
    .attrs({ id: 'btn_north', src: 'static/img/layout_icons/north-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.north_arrow' })
    .on('click', () => add_layout_feature('north_arrow'));
  p2.insert('span')
    .insert('img')
    .attrs({ id: 'btn_scale', src: 'static/img/layout_icons/scale.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.scale' })
    .on('click', () => add_layout_feature('scale'));
  p2.insert('span')
    .insert('img')
    .attrs({ id: 'btn_sphere', src: 'static/img/layout_icons/sphere-01.png', class: 'layout_ft_ico i18n', 'data-i18n': '[title]app_page.layout_features_box.sphere' })
    .on('click', () => add_layout_feature('sphere'));

  add_simplified_land_layer();

  const section5b = d3.select('#section5');
  const dv5b = section5b.append('div').attr('class', 'form-item');

  const type_export = dv5b.append('p');
  type_export.append('span')
    .attr('class', 'i18n')
    .attr('data-i18n', '[html]app_page.section5b.type');
  const select_type_export = type_export.append('select')
    .attrs({ id: 'select_export_type', class: 'm_elem_right' })
    .on('change', function () {
      const type = this.value,
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

  const export_png_options = dv5b.append('p')
    .attr('id', 'export_options_png')
    .style('display', 'none');

  export_png_options.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.format' });

  const select_size_png = export_png_options.append('select')
    .attrs({ id: 'select_png_format', class: 'm_elem_right' });
  fill_export_png_options('user_defined');

  select_size_png.on('change', function () {
    const value = this.value,
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

  const exp_a = export_png_options.append('p');
  exp_a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.width' });

  exp_a.append('input')
    .style('width', '60px')
    .attrs({ id: 'export_png_width', class: 'm_elem_right', type: 'number', step: 0.1, value: w })
    .on('change', function () {
      const ratio = h / w,
        export_png_height = document.getElementById('export_png_height');
      export_png_height.value = Math.round(+this.value * ratio * 10) / 10;
    });

  exp_a.append('span')
    .attr('id', 'export_png_width_txt')
    .html(' (px)');

  const exp_b = export_png_options.append('p');
  exp_b.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.height' });

  exp_b.append('input')
    .style('width', '60px')
    .attrs({ id: 'export_png_height', class: 'm_elem_right', type: 'number', step: 0.1, value: h })
    .on('change', function () {
      const ratio = h / w,
        export_png_width = document.getElementById('export_png_width');
      export_png_width.value = Math.round(+this.value / ratio * 10) / 10;
    });

  exp_b.append('span')
          .attr('id', 'export_png_height_txt')
          .html(' (px)');

  const export_name = dv5b.append('p');
  export_name.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.filename' });

  export_name.append('input')
    .attrs({ id: 'export_filename', class: 'm_elem_right', type: 'text' });

  const export_geo_options = dv5b.append('p')
    .attr('id', 'export_options_geo')
    .style('display', 'none');

  const geo_a = export_geo_options.append('p')
    .style('margin-bottom', '0');
  geo_a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_layer' });

  const selec_layer = export_geo_options.insert('select')
    .styles({ position: 'sticky', float: 'right' })
    .attrs({ id: 'layer_to_export', class: 'i18n m_elem_right' });

  const geo_b = export_geo_options.append('p')
    .styles({ clear: 'both' }); // 'margin-top': '35px !important'
  geo_b.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_datatype' });
  const selec_type = geo_b.insert('select')
    .attrs({ id: 'datatype_to_use', class: 'i18n m_elem_right' })
    .style('margin-top', '5px');

  export_geo_options.append('p')
    .style('margin', 'auto')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_projection' });
  const geo_c = export_geo_options.append('p').style('margin', 'auto');
  const selec_projection = geo_c.insert('select')
    .styles({ position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px' })
    .attrs({ id: 'projection_to_use', disabled: true, class: 'i18n' });

  const proj4_input = export_geo_options.append('p').style('margin', 'auto')
    .insert('input')
    .attrs({ id: 'proj4str' })
    .styles({ display: 'none', width: '275px', position: 'relative', float: 'right', 'margin-right': '5px', 'font-size': '10.5px' })
    .on('keyup', function () {
      ok_button.disabled = this.value.length === 0 ? 'true' : '';
    });

  ['GeoJSON', 'TopoJSON', 'ESRI Shapefile', 'GML', 'KML'].forEach((name) => {
    selec_type.append('option').attr('value', name).text(name);
  });

  [
    ['app_page.section5b.wgs84', 'epsg:4326'],
    ['app_page.section5b.web_mercator', 'epsg:3857'],
    ['app_page.section5b.laea_europe', 'epsg:3035'],
    ['app_page.section5b.usa_albers', '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs'],
    ['app_page.section5b.british_national_grid', 'epsg:27700'],
    ['app_page.section5b.lambert93', 'epsg:2154'],
    ['app_page.section5b.eckert_4', '+proj=eck4 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs '],
    ['app_page.section5b.proj4_prompt', 'proj4string'],
  ].forEach((projection) => {
    selec_projection.append('option')
      .attrs({ class: 'i18n', value: projection[1], 'data-i18n': projection[0] })
      .text(i18next.t(projection[0]));
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
  let ok_button = dv5b.append('p').style('float', 'left')
    .append('button')
    .attrs({ id: 'export_button_section5b', class: 'i18n button_st4', 'data-i18n': '[html]app_page.section5b.export_button' })
    .on('click', () => {
      const type_exp = document.getElementById('select_export_type').value,
        exp_name = document.getElementById('export_filename').value;
      if (type_exp === 'svg') {
        export_compo_svg(exp_name);
      } else if (type_exp === 'geo') {
        const layer_name = document.getElementById('layer_to_export').value,
          type = document.getElementById('datatype_to_use').value,
          proj = document.getElementById('projection_to_use').value,
          proj4value = document.getElementById('proj4str').value;
        export_layer_geo(layer_name, type, proj, proj4value);
      } else if (type_exp === 'png') {
        let exp_type = document.getElementById('select_png_format').value,
          ratio;
        if (exp_type === 'web') {
          ratio = +document.getElementById('export_png_height').value / +h;
        } else {
          exp_type = 'paper';
          ratio = (+document.getElementById('export_png_height').value * 118.11) / +h;
        }
        _export_compo_png(exp_type, ratio, exp_name);
      }
    });

  // Zoom-in, Zoom-out, Info, Hand-Move and RectZoom buttons (on the top of the map) :
  const lm = map_div
    .append('div')
    .attr('class', 'light-menu')
    .styles({ position: 'absolute', right: '0px', bottom: '0px' });

  const lm_buttons = [
    { id: 'zoom_out', i18n: '[tooltip-title]app_page.lm_buttons.zoom-', tooltip_position: 'left', class: 'zoom_button i18n', html: '-' },
    { id: 'zoom_in', i18n: '[tooltip-title]app_page.lm_buttons.zoom+', tooltip_position: 'left', class: 'zoom_button i18n', html: '+' },
    { id: 'info_button', i18n: '[tooltip-title]app_page.lm_buttons.i', tooltip_position: 'left', class: 'info_button i18n', html: 'i' },
    { id: 'brush_zoom_button', i18n: '[tooltip-title]app_page.lm_buttons.zoom_rect', tooltip_position: 'left', class: 'brush_zoom_button i18n', html: '<img src="static/img/Inkscape_icons_zoom_fit_selection_blank.png" width="18" height="18" alt="Zoom_select"/>' },
    { id: 'hand_button', i18n: '[tooltip-title]app_page.lm_buttons.hand_button', tooltip_position: 'left', class: 'hand_button active i18n', html: '<img src="static/img/Twemoji_1f513.png" width="18" height="18" alt="Hand_closed"/>' },
  ];

  const selec = lm.selectAll('input')
    .data(lm_buttons)
    .enter()
    .append('p')
    .style('margin', 'auto')
    .insert('button')
    .attrs(elem => ({
      'data-placement': elem.tooltip_position,
      class: elem.class,
      'data-i18n': elem.i18n,
      id: elem.id }))
    .html(elem => elem.html);

  // Trigger actions when buttons are clicked and set-up the initial view :
  d3.selectAll('.zoom_button').on('click', zoomClick);
  document.getElementById('info_button').onclick = displayInfoOnMove;
  document.getElementById('hand_button').onclick = handle_click_hand;
  document.getElementById('brush_zoom_button').onclick = handleZoomRect;

  // Already append the div for displaying information on features,
  // setting it currently unactive until it will be requested :
  d3.select('body')
    .append('div')
    .attr('id', 'info_features')
    .classed('active', false)
    .style('display', 'none')
    .html('');

  accordionize('.accordion');
  document.getElementById('btn_s1').dispatchEvent(new MouseEvent('click'));
  prepare_drop_section();

  if (reload_project) {
    let url;
    if (reload_project.startsWith('http')) {
      url = reload_project;
    } else {
      url = `https://gist.githubusercontent.com/${reload_project}/raw/`;
    }
    xhrequest('GET', url, undefined, true)
      .then((data) => {
        apply_user_preferences(data);
      });
  } else {
    // Check if there is a project to reload in the localStorage :
    const last_project = window.localStorage.getItem('magrit_project');
    if (last_project && last_project.length && last_project.length > 0) {
      swal({ title: '',
            // text: i18next.t('app_page.common.resume_last_project'),
        allowOutsideClick: false,
        allowEscapeKey: false,
        type: 'question',
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: i18next.t('app_page.common.new_project'),
        cancelButtonText: i18next.t('app_page.common.resume_last'),
      }).then(() => {
        // If we don't want to resume from the last project, we can
        // remove it :
        window.localStorage.removeItem('magrit_project');
        // Indicate that that no layer have been added for now :*
        _app.first_layer = true;
      }, (dismiss) => {
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
  return 'L_' + s.replace(/[^a-zA-Z0-9_-]/g, match => '_' + match[0].charCodeAt(0).toString(16) + '_');
}

function bindTooltips(dataAttr = 'tooltip-title') {
    // bind the mains tooltips
  const tooltips_elem = document.querySelectorAll('[' + dataAttr + ']');
  for (let i = tooltips_elem.length - 1; i > -1; i--) {
    new Tooltip(tooltips_elem[i], {
      dataAttr: dataAttr,
      animation: 'slideNfade',
      duration: 50,
      delay: 100,
      container: document.getElementById('twbs'),
    });
  }
}

function make_eye_button(state) {
  if (state === 'open') {
    const eye_open = document.createElement('img');
    eye_open.setAttribute('src', 'static/img/b/eye_open.png');
    eye_open.setAttribute('class', 'active_button i18n');
    eye_open.setAttribute('id', 'eye_open');
    eye_open.setAttribute('width', 17);
    eye_open.setAttribute('height', 17);
    eye_open.setAttribute('alt', 'Visible');
    return eye_open;
  } else if (state === 'closed') {
    const eye_closed = document.createElement('img');
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
  const new_lang = this.name;
  if (new_lang !== i18next.language) {
    docCookies.setItem('user_lang', new_lang, 31536e3, '/');
    i18next.changeLanguage(new_lang, () => {
      localize('.i18n');
      bindTooltips();
    });
    document.getElementById('current_app_lang').innerHTML = new_lang;
    const menu = document.getElementById('menu_lang');
    if (menu) menu.remove();
  }
}

function make_ico_choice() {
  const list_fun_ico = [
    'prop.png',
    'choro.png',
    'typo.png',
    'choroprop.png',
    'proptypo.png',
    'grid.png',
    'cartogram.png',
    'smooth.png',
    'discont.png',
    'typosymbol.png',
    'flow.png',
    'two_stocks.png',
  ];

  const function_panel = section2_pre.append('div')
    .attr('id', 'list_ico_func');

  for (let i = 0, len_i = list_fun_ico.length; i < len_i; i++) {
    const ico_name = list_fun_ico[i],
      func_name = ico_name.split('.')[0],
      func_desc = get_menu_option(func_name).desc,
      margin_value = '5px 16px';
        // margin_value = i == 8 ? '5px 16px 5px 55px' : '5px 16px';
    function_panel
      .insert('img')
      .styles({ margin: margin_value, cursor: 'pointer', width: '50px', float: 'left', 'list-style': 'none' })
      .attrs({
        class: 'i18n',
        'data-i18n': ['[title]app_page.func_description.', func_name].join(''),
        src: ['static/img/func_icons2/', ico_name].join(''),
        id: `button_${func_name}` })
      .on('click', function () {
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
        const make_menu = window[_app.current_functionnality.menu_factory];
        window.fields_handler = window[_app.current_functionnality.fields_handler];
        make_menu();

        // Replace the title of the section:
        const selec_title = document.getElementById('btn_s2b');
        selec_title.innerHTML = '<span class="i18n" data-i18n="app_page.common.representation">' +
                                i18next.t('app_page.common.representation') +
                                '</span><span> : </span><span class="i18n" data-i18n="app_page.func_title.' +
                                _app.current_functionnality.name +
                                '">' +
                                i18next.t('app_page.func_title.' + _app.current_functionnality.name) +
                                '</span>';
        selec_title.style.display = '';

        // Don't fill the menu / don't highlight the icon if the type of representation is not authorizhed :
        if (this.style.filter !== 'grayscale(100%)') {
          this.classList.add('active');
          // Highlight the icon of the selected functionnality :
          this.style.filter = 'invert(100%) saturate(200%)';

          // Fill the field of the functionnality with the field
          // of the targeted layer if already uploaded by the user :
          if (_app.targeted_layer_added) {
            const target_layer = Object.getOwnPropertyNames(user_data)[0];
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
  }
}

let proj = d3.geoNaturalEarth2().scale(1).translate([0, 0]);
let path = d3.geoPath().projection(proj).pointRadius(4);
let t = proj.translate();
let s = proj.scale();
let current_proj_name = 'NaturalEarth2';
let zoom = d3.zoom().on('zoom', zoom_without_redraw);
let w = Math.round(window.innerWidth - 361);
let h = window.innerHeight - 55;
/*
A bunch of global variable, storing oftently reused informations :
    - user_data[layer_name] : will be an Array of Objects containing data for each features of the targeted layer
            (+ the joined features if a join is done)
    - result_data[layer_name] : the same but for any eventual result layers (like Stewart, gridded, etc.)
    - joined_dataset : the joined dataset (read with d3.csv then pushed in the first slot of this array)
    - field_join_map : an array containg mapping between index of geom layer and index of ext. dataset
    - current_layers : the main object describing **all** the layers on the map (incunding detailed (ie. by features) styling properties if needed)
*/

let user_data = {};
let result_data = {};
let joined_dataset = [];
let field_join_map = [];
let current_layers = {};
let dataset_name;
let canvas_rotation_value;
let map_div = d3.select('#map');
const pos_lgds_elem = new Map();

// The 'map' (so actually the `map` variable is a reference to the main `svg` element on which we are drawing)
const map = map_div.styles({ width: `${w}px`, height: `${h}px` })
  .append('svg')
  .attrs({ id: 'svg_map', width: w, height: h })
  .style('background-color', 'rgba(255, 255, 255, 0)')
  .style('position', 'absolute')
  .on('contextmenu', (event) => { d3.event.preventDefault(); })
  .call(zoom);

const svg_map = map.node();
let defs = map.append('defs');

const _app = {
  to_cancel: undefined,
  targeted_layer_added: false,
  current_functionnality: undefined,
  layer_to_id: new Map([['World', encodeId('World')], ['Graticule', encodeId('Graticule')]]),
  id_to_layer: new Map([[encodeId('World'), 'World'], [encodeId('Graticule'), 'Graticule']]),
  version: document.querySelector('#header').getAttribute('v'),
  existing_lang: ['en', 'es', 'fr'],
  custom_palettes: new Map(),
};

// A bunch of references to the buttons used in the layer manager
// and some mapping to theses reference according to the type of geometry :
const button_trash = ' <img src="static/img/Trash_font_awesome.png" id="trash_button" width="15" height="15" alt="trash_button"/>',
  button_legend = ' <img src="static/img/qgis_legend.png" id="legend_button" width="17" height="17" alt="legend_button"/>',
  button_zoom_fit = ' <img src="static/img/Inkscape_icons_zoom_fit_page.png" id="zoom_fit_button" width="16" height="16" alt="zoom_button"/></button>',
  button_table = ' <img src="static/img/dataset.png" id="browse_data_button" width="16" height="16" alt="dataset_button"/></button>',
  button_type = new Map([
    ['Point', '<img src="static/img/type_geom/dot.png" class="ico_type" width="17" height="17" alt="Point"/>'],
    ['Line', '<img src="static/img/type_geom/line.png" class="ico_type" width="17" height="17" alt="Line"/>'],
    ['Polygon', '<img src="static/img/type_geom/poly.png" class="ico_type" width="17" height="17" alt="Polygon"/>'],
  ]);

const button_result_type = new Map([
  ['flow', '<img src="static/img/type_geom/layer_flow.png" class="ico_type" width="17" height="17" alt="flow"/>'],
  ['symbol', '<img src="static/img/type_geom/layer_symbol.png" class="ico_type" width="17" height="17" alt="symbol"/>'],
  ['grid', '<img src="static/img/type_geom/layer_grid.png" class="ico_type" width="17" height="17" alt="grid"/>'],
  ['propchoro', '<img src="static/img/type_geom/layer_propchoro.png" class="ico_type" width="17" height="17" alt="propchoro"/>'],
  ['typo', '<img src="static/img/type_geom/layer_typo.png" class="ico_type" width="17" height="17" alt="typo"/>'],
  ['discont', '<img src="static/img/type_geom/layer_disc.png" class="ico_type" width="17" height="17" alt="discont"/>'],
  ['cartogram', '<img src="static/img/type_geom/layer_cartogram.png" class="ico_type" width="17" height="17" alt="cartogram"/>'],
  ['label', '<img src="static/img/type_geom/layer_label.png" class="ico_type" width="17" height="17" alt="label"/>'],
  ['choro', '<img src="static/img/type_geom/layer_choro.png" class="ico_type" width="17" height="17" alt="choro"/>'],
  ['smooth', '<img src="static/img/type_geom/layer_smooth.png" class="ico_type" width="17" height="17" alt="smooth"/>'],
  ['prop', '<img src="static/img/type_geom/layer_prop.png" class="ico_type" width="17" height="17" alt="prop"/>'],
  ['waffle', '<img src="static/img/type_geom/layer_waffle.png" class="ico_type" width="17" height="17" alt="waffle"/>'],
]);

const eye_open0 = '<img src="static/img/b/eye_open.png" class="active_button" id="eye_open"  width="17" height="17" alt="Visible"/>';

// Reference to the sys run button already in two requested sizes are they are called many times :
const sys_run_button = '<img src="static/img/High-contrast-system-run.png" width="22" height="22" style="vertical-align: inherit;" alt="submit"/>';
const sys_run_button_t2 = '<img src="static/img/High-contrast-system-run.png" class="style_target_layer" width="18" height="18" alt="Layer_rendering" style="float:right;"/>';

// Shortcut to the name of the methods offered by geostats library:
const discretiz_geostats_switch = new Map([
  ['jenks', 'getJenks'],
  ['equal_interval', 'getEqInterval'],
  // ['std_dev', 'getStdDeviation'],
  ['quantiles', 'getQuantile'],
  ['arithmetic_progression', 'getArithmeticProgression'],
  ['Q6', 'getBreaksQ6'],
  ['geometric_progression', 'getGeometricProgression'],
]);

// Reference to the available fonts that the user could select :
const available_fonts = [
  ['Arial', 'Arial,Helvetica,sans-serif'],
  ['Arial Black', 'Arial Black,Gadget,sans-serif'],
  ['Arimo', 'Arimo,sans-serif'],
  ['Baloo Bhaina', 'Baloo Bhaina,sans-serif'],
  ['Bitter', 'Bitter,sans-serif'],
  ['Dosis', 'Dosis,sans-serif'],
  ['Roboto', 'Roboto,sans-serif'],
  ['Lobster', 'Lobster,sans-serif'],
  ['Impact', 'Impact,Charcoal,sans-serif'],
  ['Inconsolata', 'Inconsolata,sans-serif'],
  ['Georgia', 'Georgia,serif'],
  ['Lobster', 'Lobster,serif'],
  ['Lucida', 'Lucida Sans Unicode,Lucida Grande,sans-serif'],
  ['Palatino', 'Palatino Linotype,Book Antiqua,Palatino,serif'],
  ['Roboto', 'Roboto'],
  ['Scope One', 'Scope One'],
  ['Tahoma', 'Tahoma,Geneva,sans-serif'],
  ['Trebuchet MS', 'Trebuchet MS,elvetica,sans-serif'],
  ['Verdana', 'Verdana,Geneva,sans-serif'],
];

// This variable have to be (well, we could easily do this in an other way!) up to date
// with the style-fonts.css file as we are using their order to lookup for their definition
// the .css file.
const customs_fonts = ['Arimo', 'Baloo Bhaina', 'Bitter', 'Dosis', 'Inconsolata', 'Lobster', 'Roboto', 'Scope One'];

function parseQuery(search) {
  const args = search.substring(1).split('&');
  const argsParsed = {};
  let arg,
    kvp,
    key,
    value;
  for (let i = 0; i < args.length; i++) {
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
  let lang = docCookies.getItem('user_lang') || window.navigator.language.split('-')[0];
  const params = {};
  document.querySelector('noscript').remove();
  window.isIE = (() => (/MSIE/i.test(navigator.userAgent)
    || /Trident\/\d./i.test(navigator.userAgent)
    || /Edge\/\d./i.test(navigator.userAgent))
  )();
  // window.isOldMS_Firefox = (() => (/Firefox/i.test(navigator.userAgent)
  //   && (/Windows NT 6.0/i.test(navigator.userAgent)
  //       || /Windows NT 6.1/i.test(navigator.userAgent))) ? true : false
  // )();
  if (window.location.search) {
    const parsed_querystring = parseQuery(window.location.search);
    params.reload = parsed_querystring.reload;
    if (typeof (history.replaceState) !== 'undefined') {
      // replaceState should avoid creating a new entry on the history
      const obj = { Page: window.location.search, Url: window.location.pathname };
      history.replaceState(obj, obj.Page, obj.Url);
    }
  }

  lang = _app.existing_lang.indexOf(lang) > -1 ? lang : 'en';
  i18next.use(i18nextXHRBackend)
    .init({
      debug: true,
      lng: lang,
      fallbackLng: _app.existing_lang[0],
      backend: {
        loadPath: 'static/locales/{{lng}}/translation.json',
      },
    }, (err, tr) => {
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
  const legend_features = svg_map.querySelectorAll('.legend');
  for (let i = 0; i < legend_features.length; i++) {
    svg_map.appendChild(legend_features[i], null);
  }
}

// To bind the set of small buttons
// (trash icon, paint icon, active/deactive visibility, info tooltip, etc..)
// which are on each feature representing a layer in the layer manager
// (the function is called each time that a new feature is put in this layer manager)
function binds_layers_buttons(layer_name) {
  const layer_id = _app.layer_to_id.get(layer_name);
  const sortable_elem = d3.select('#sortable').select(`.${layer_id}`);
  sortable_elem.on('dblclick', () => { handle_click_layer(layer_name); });
  sortable_elem.on('contextmenu', () => { d3.event.preventDefault(); });
  sortable_elem.select('#trash_button').on('click', () => { remove_layer(layer_name); });
  sortable_elem.select('.active_button').on('click', () => { handle_active_layer(layer_name); });
  sortable_elem.select('.style_button').on('click', () => { handle_click_layer(layer_name); });
  sortable_elem.select('.style_target_layer').on('click', () => { handle_click_layer(layer_name); });
  sortable_elem.select('#legend_button').on('click', () => { handle_legend(layer_name); });
  sortable_elem.select('#browse_data_button').on('click', () => { boxExplore2.create(layer_name); });
  sortable_elem.select('#zoom_fit_button').on('click', () => {
    center_map(layer_name);
    zoom_without_redraw();
  });
  // TODO : re-add a tooltip when the mouse is over that sortable element ?
}

// Function to display information on the top layer (in the layer manager)
function displayInfoOnMove() {
  const info_features = d3.select('#info_features');
  if (info_features.classed('active')) {
    map.selectAll('.layer').selectAll('path').on('mouseover', null);
    map.selectAll('.layer').selectAll('circle').on('mouseover', null);
    map.selectAll('.layer').selectAll('rect').on('mouseover', null);
    info_features.classed('active', false);
    info_features.style('display', 'none').html('');
    svg_map.style.cursor = '';
  } else {
    map.select('.brush').remove();
    const layers = svg_map.querySelectorAll('.layer'),
      nb_layer = layers.length;
    let top_visible_layer = null;

    for (let i = nb_layer - 1; i > -1; i--) {
      if (layers[i].style.visibility !== 'hidden') {
        top_visible_layer = _app.id_to_layer.get(layers[i].id);
        break;
      }
    }

    if (!top_visible_layer) {
      swal('', i18next.t('app_page.common.error_no_visible'), 'error');
      return;
    }

    const id_top_layer = `#${_app.layer_to_id.get(top_visible_layer)}`;
    const symbol = current_layers[top_visible_layer].symbol || 'path';

    map.select(id_top_layer).selectAll(symbol).on('mouseover', (d, i) => {
      const txt_info = [
        '<h3>', top_visible_layer, '</h3><i>Feature ',
        i + 1, '/', current_layers[top_visible_layer].n_features, '</i><p>'];
      const properties = result_data[top_visible_layer] ? result_data[top_visible_layer][i] : d.properties;
      Object.getOwnPropertyNames(properties).forEach((el) => {
        txt_info.push(`<br><b>${el}</b> : ${properties[el]}`);
      });
      txt_info.push('</p>');
      info_features.style('display', null).html(txt_info.join(''));
    });

    map.select(id_top_layer).selectAll(symbol).on('mouseout', () => {
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
  const layers = Object.keys(current_layers);
  const n_layers = layers.length;
  let lyr_name;
  for (let ix = 0; ix < n_layers; ix++) {
    lyr_name = layers[ix];
    if (current_layers[lyr_name].renderer
        && (current_layers[lyr_name].renderer.indexOf('PropSymbol') > -1
            || current_layers[lyr_name].renderer.indexOf('TypoSymbols') > -1
            || current_layers[lyr_name].renderer.indexOf('Label') > -1)) {
      const symbol = current_layers[lyr_name].symbol;

      if (symbol === 'text') { // Reproject the labels :
        map.select(`#${_app.layer_to_id.get(lyr_name)}`)
          .selectAll(symbol)
          .attrs((d) => {
            const pt = path.centroid(d.geometry);
            return { x: pt[0], y: pt[1] };
          });
      } else if (symbol === 'image') { // Reproject pictograms :
        map.select(`#${_app.layer_to_id.get(lyr_name)}`)
          .selectAll(symbol)
          .attrs(function (d, i) {
            const coords = path.centroid(d.geometry),
              size = +this.getAttribute('width').replace('px', '') / 2;
            return { x: coords[0] - size, y: coords[1] - size };
          });
      } else if (symbol === 'circle') { // Reproject Prop Symbol :
        map.select(`#${_app.layer_to_id.get(lyr_name)}`)
          .selectAll(symbol)
          .style('display', d => (isNaN(+path.centroid(d)[0]) ? 'none' : undefined))
          .attrs((d) => {
            const centroid = path.centroid(d);
            return {
              r: d.properties.prop_value,
              cx: centroid[0],
              cy: centroid[1],
            };
          });
      } else if (symbol === 'rect') { // Reproject Prop Symbol :
        map.select(`#${_app.layer_to_id.get(lyr_name)}`)
          .selectAll(symbol)
          .style('display', d => (isNaN(+path.centroid(d)[0]) ? 'none' : undefined))
          .attrs((d) => {
            const centroid = path.centroid(d),
              size = d.properties.prop_value;
            return {
              height: size,
              width: size,
              x: centroid[0] - size / 2,
              y: centroid[1] - size / 2,
            };
          });
      }
    } else if (current_layers[lyr_name].pointRadius !== undefined) {
      map.select(`#${_app.layer_to_id.get(lyr_name)}`)
        .selectAll('path')
        .attr('d', path.pointRadius(current_layers[lyr_name].pointRadius));
    } else if (current_layers[lyr_name].renderer === 'TwoStocksWaffle') {
      const selection = svg_map.querySelector(`#${_app.layer_to_id.get(lyr_name)}`).querySelectorAll('g');
      const nbFt = selection.length;
      if (current_layers[lyr_name].symbol === 'circle') {
        for (let i = 0; i < nbFt; i++) {
          const centroid = path.centroid({
            type: 'Point',
            coordinates: selection[i].__data__.properties.centroid,
          });
          const symbols = selection[i].querySelectorAll('circle');
          for (let j = 0, nb_symbol = symbols.length; j < nb_symbol; j++) {
            symbols[j].setAttribute('cx', centroid[0]);
            symbols[j].setAttribute('cy', centroid[1]);
          }
        }
      } else {
        for (let i = 0; i < nbFt; i++) {
          const centroid = path.centroid({
            type: 'Point',
            coordinates: selection[i].__data__.properties.centroid,
          });
          const symbols = selection[i].querySelectorAll('rect');
          for (let j = 0, nb_symbol = symbols.length; j < nb_symbol; j++) {
            symbols[j].setAttribute('x', centroid[0]);
            symbols[j].setAttribute('y', centroid[1]);
          }
        }
      }
    }
  }
  /* eslint-enable no-loop-func */
}

function make_dialog_container(id_box, title, class_box) {
  const _id_box = id_box || 'dialog';
  const _title = title || '';
  const _class_box = class_box || 'dialog';
  const container = document.createElement('div');
  container.setAttribute('id', id_box);
  container.setAttribute('class', `twbs modal fade ${_class_box}`);
  container.setAttribute('tabindex', '-1');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-labelledby', 'myModalLabel');
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = '<div class="modal-dialog"><div class="modal-content"></div></div>';
  document.getElementById('twbs').appendChild(container);
  const html_content = `<div class="modal-header">
    <button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
    <h4 class="modal-title" id="gridModalLabel">${_title}</h4>
    </div>
    <div class="modal-body"> </div>
    <div class="modal-footer">
    <button type="button" class="btn btn-primary btn_ok" data-dismiss="modal">${i18next.t('app_page.common.confirm')}</button>
    <button type="button" class="btn btn-default btn_cancel">${i18next.t('app_page.common.cancel')}</button>
    </div>`;
  const modal_box = new Modal(document.getElementById(_id_box), { content: html_content });
  modal_box.show();
  return modal_box;
}

const overlay_under_modal = (function () {
  const twbs_div = document.querySelector('.twbs');
  const bg = document.createElement('div');
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
    display: function () { bg.style.display = ''; },
    hide: function () { bg.style.display = 'none'; },
  };
})();

const make_confirm_dialog2 = (function (class_box, title, options) {
  const get_available_id = () => {
    for (let i = 0; i < 50; i++) {
      if (!existing.has(i)) {
        existing.add(i);
        return i;
      }
    }
  };
  let existing = new Set();
  return (class_box, title, options) => {
    class_box = class_box || 'dialog';
    title = title || i18next.t('app_page.common.ask_confirm');
    options = options || {};

    let container = document.createElement('div');
    const new_id = get_available_id();

    container.setAttribute('id', `myModal_${new_id}`);
    container.setAttribute('class', `twbs modal fade ${class_box}`);
    container.setAttribute('tabindex', '-1');
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-labelledby', 'myModalLabel');
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = options.widthFitContent ? '<div class="modal-dialog fitContent"><div class="modal-content"></div></div>'
                        : '<div class="modal-dialog"><div class="modal-content"></div></div>';
    document.getElementById('twbs').appendChild(container);

    container = document.getElementById(`myModal_${new_id}`);
    const deferred = Promise.pending();
    const text_ok = options.text_ok || i18next.t('app_page.common.confirm');
    const text_cancel = options.text_cancel || i18next.t('app_page.common.cancel');
    const html_content = `<div class="modal-header">
      <button type="button" id="xclose" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
      <h4 class="modal-title" id="gridModalLabel">${title}</h4>
      </div>
      <div class="modal-body"><p>${options.html_content || ''}</p></div>
      <div class="modal-footer">
      <button type="button" class="btn btn-primary btn_ok" data-dismiss="modal">${text_ok}</button>
      <button type="button" class="btn btn-default btn_cancel">${text_cancel}</button>
      </div>`;
    const modal_box = new Modal(container, {
      backdrop: true,
      keyboard: false,
      content: html_content,
    });
    modal_box.show();
    container.modal = modal_box;
    overlay_under_modal.display();
    const func_cb = (evt) => { helper_esc_key_twbs_cb(evt, _onclose_false); };
    const clean_up_box = () => {
      document.removeEventListener('keydown', func_cb);
      existing.delete(new_id);
      overlay_under_modal.hide();
      container.remove();
    };
    let _onclose_false = () => {
      deferred.resolve(false);
      clean_up_box();
    };
    container.querySelector('.btn_cancel').onclick = _onclose_false;
    container.querySelector('#xclose').onclick = _onclose_false;
    container.querySelector('.btn_ok').onclick = () => {
      deferred.resolve(true);
      clean_up_box();
    };
    document.addEventListener('keydown', func_cb);
    return deferred.promise;
  };
})();


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
    confirmButtonText: `${i18next.t('app_page.common.delete')}!`,
    cancelButtonText: i18next.t('app_page.common.cancel'),
  }).then(() => { remove_layer_cleanup(name); },
          () => null);
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
    confirmButtonText: `${i18next.t('app_page.common.delete')}!`,
    cancelButtonText: i18next.t('app_page.common.cancel'),
  }).then(() => {
    remove_ext_dataset_cleanup();
  }, () => null);
}

function remove_ext_dataset_cleanup() {
  field_join_map = [];
  joined_dataset = [];
  dataset_name = undefined;
  const ext_dataset_img = document.getElementById('img_data_ext');
  ext_dataset_img.setAttribute('src', 'static/img/b/addtabular.png');
  ext_dataset_img.setAttribute('alt', 'Additional dataset');
  ext_dataset_img.style.cursor = 'pointer';
  ext_dataset_img.onclick = click_button_add_layer;
  const data_ext_txt = document.getElementById('data_ext');
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
  const layer_id = _app.layer_to_id.get(name);
  // Making some clean-up regarding the result layer :
  if (current_layers[name].is_result) {
    map.selectAll(['.lgdf_', layer_id].join('')).remove();
    if (result_data.hasOwnProperty(name)) {
      delete result_data[name];
    }
    if (current_layers[name].hasOwnProperty('key_name')
         && current_layers[name].renderer.indexOf('Choropleth') < 0
         && current_layers[name].renderer.indexOf('Categorical') < 0) {
      send_remove_server(name);
    }
  }
  // Is the layer using a filter ? If yes, remove it:
  const filter_id = map.select(`#${layer_id}`).attr('filter');
  if (filter_id) {
    svg_map.querySelector(filter_id.substr(4).replace(')', '')).remove();
  }

  // Remove the layer from the map and from the layer manager :
  map.select(`#${layer_id}`).remove();
  document.querySelector(`#sortable .${layer_id}`).remove();

  // Remove the layer from the "geo export" menu :
  const a = document.getElementById('layer_to_export').querySelector(`option[value="${name}"]`);
  if (a) a.remove();

  // Remove the layer from the "mask" section if the "smoothed map" menu is open :
  if (_app.current_functionnality && _app.current_functionnality.name === 'smooth') {
    const aa = document.getElementById('stewart_mask').querySelector(`option[value="${name}"]`);
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
    d3.select('#img_in_geom')
      .attrs({ id: 'img_in_geom',
        class: 'user_panel',
        src: 'static/img/b/addgeom.png',
        width: '24',
        height: '24',
        alt: 'Geometry layer' })
      .on('click', click_button_add_layer);
    d3.select('#input_geom')
      .attrs({ class: 'user_panel i18n', 'data-i18n': '[html]app_page.section1.add_geom' })
      .html(i18next.t('app_page.section1.add_geom'))
      .on('click', click_button_add_layer);
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
  const hb = d3.select('.hand_button');
  // eslint-disable-next-line no-param-reassign
  const b = (behavior && typeof behavior !== 'object' ? behavior : false) || !hb.classed('locked') ? 'lock' : 'unlock';
  if (b === 'lock') {
    hb.classed('locked', true);
    hb.html('<img src="static/img/Twemoji_1f512.png" width="18" height="18" alt="locked"/>');
    map.select('.brush').remove();
    document.getElementById('zoom_in').parentElement.style.display = 'none';
    document.getElementById('zoom_out').parentElement.style.display = 'none';
    document.getElementById('brush_zoom_button').parentElement.style.display = 'none';
    zoom.on('zoom', (() => { const blocked = svg_map.__zoom; return function () { this.__zoom = blocked; }; })());
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
  const rot_val = canvas_rotation_value || '';
  let transform;
  let t_val;
  if (!d3.event || !d3.event.transform || !d3.event.sourceEvent) {
    transform = d3.zoomTransform(svg_map);
    t_val = transform.toString() + rot_val;
    map.selectAll('.layer')
      .transition()
      .duration(50)
      .style('stroke-width', function () {
        const lyr_name = _app.id_to_layer.get(this.id);
        return current_layers[lyr_name].fixed_stroke
          ? this.style.strokeWidth
          : `${current_layers[lyr_name]['stroke-width-const'] / transform.k}px`;
      })
      .attr('transform', t_val);
    map.selectAll('.scalable-legend')
      .transition()
      .duration(50)
      .attr('transform', t_val);
  } else {
    t_val = d3.event.transform + rot_val;
    map.selectAll('.layer')
      .transition()
      .duration(50)
      .style('stroke-width', function () {
        const lyr_name = _app.id_to_layer.get(this.id);
        return current_layers[lyr_name].fixed_stroke
          ? this.style.strokeWidth
          : `${current_layers[lyr_name]['stroke-width-const'] / d3.event.transform.k}px`;
      })
      .attr('transform', t_val);
    map.selectAll('.scalable-legend')
      .transition()
      .duration(50)
      .attr('transform', t_val);
  }

  if (scaleBar.displayed) {
    scaleBar.update();
  }
  if (window.legendRedrawTimeout) {
    clearTimeout(legendRedrawTimeout);
  }
  window.legendRedrawTimeout = setTimeout(redraw_legends_symbols, 650);
  const zoom_params = svg_map.__zoom;
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
  const legend_nodes = targeted_node ? [targeted_node] : document.querySelectorAll('#legend_root_symbol');
  const hide = svg_map.__zoom.k > 4 || svg_map.__zoom.k < 0.15;
  const hidden = [];

  for (let i = 0; i < legend_nodes.length; ++i) {
    const layer_id = legend_nodes[i].classList[2].split('lgdf_')[1],
      layer_name = _app.id_to_layer.get(layer_id),
      rendered_field = current_layers[layer_name].rendered_field,
      nested = legend_nodes[i].getAttribute('nested'),
      display_value = legend_nodes[i].getAttribute('display'),
      visible = legend_nodes[i].style.visibility;

    const transform_param = legend_nodes[i].getAttribute('transform'),
      rounding_precision = legend_nodes[i].getAttribute('rounding_precision'),
      lgd_title = legend_nodes[i].querySelector('#legendtitle').innerHTML,
      lgd_subtitle = legend_nodes[i].querySelector('#legendsubtitle').innerHTML,
      notes = legend_nodes[i].querySelector('#legend_bottom_note').innerHTML;

    const rect_fill_value = legend_nodes[i].getAttribute('visible_rect') === 'true' ? {
      color: legend_nodes[i].querySelector('#under_rect').style.fill,
      opacity: legend_nodes[i].querySelector('#under_rect').style.fillOpacity,
    } : undefined;

    legend_nodes[i].remove();
    createLegend_symbol(layer_name,
                        rendered_field,
                        lgd_title,
                        lgd_subtitle,
                        nested,
                        rect_fill_value,
                        rounding_precision,
                        notes);
    const new_lgd = document.querySelector(['#legend_root_symbol.lgdf_', layer_id].join(''));
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
    const legend_nodes_links_discont = document.querySelectorAll('#legend_root_lines_class');
    for (let i = 0; i < legend_nodes_links_discont.length; ++i) {
      const layer_id = legend_nodes_links_discont[i].classList[2].split('lgdf_')[1],
        layer_name = _app.id_to_layer.get(layer_id),
        rendered_field = current_layers[layer_name].rendered_field,
        display_value = legend_nodes_links_discont[i].getAttribute('display'),
        visible = legend_nodes_links_discont[i].style.visibility;

      const transform_param = legend_nodes_links_discont[i].getAttribute('transform'),
        rounding_precision = legend_nodes_links_discont[i].getAttribute('rounding_precision'),
        lgd_title = legend_nodes_links_discont[i].querySelector('#legendtitle').innerHTML,
        lgd_subtitle = legend_nodes_links_discont[i].querySelector('#legendsubtitle').innerHTML,
        notes = legend_nodes_links_discont[i].querySelector('#legend_bottom_note').innerHTML;

      const rect_fill_value = legend_nodes_links_discont[i].getAttribute('visible_rect') === 'true' ? {
        color: legend_nodes_links_discont[i].querySelector('#under_rect').style.fill,
        opacity: legend_nodes_links_discont[i].querySelector('#under_rect').style.fillOpacity,
      } : undefined;

      legend_nodes_links_discont[i].remove();
      createLegend_discont_links(layer_name,
                                 rendered_field,
                                 lgd_title,
                                 lgd_subtitle,
                                 rect_fill_value,
                                 rounding_precision,
                                 notes);
      const new_lgd = document.querySelector(['#legend_root_lines_class.lgdf_', layer_id].join(''));
      new_lgd.style.visibility = visible;
      if (transform_param) {
        new_lgd.setAttribute('transform', transform_param);
      }

      if (display_value) {
        new_lgd.setAttribute('display', display_value);
      }
      //   hidden.push(true);
      // } else if (hide) {
      //   new_lgd.setAttribute('display', 'none');
      // }
    }
  }
}

function interpolateZoom(translate, scale) {
  const transform = d3.zoomTransform(svg_map);
  return d3.transition().duration(225).tween('zoom', () => {
    const iTranslate = d3.interpolate([transform.x, transform.y], translate);
    const iScale = d3.interpolate(transform.k, scale);
    return (t_value) => {
      svg_map.__zoom.k = iScale(t_value);
      const _t = iTranslate(t_value);
      svg_map.__zoom.x = _t[0];
      svg_map.__zoom.y = _t[1];
      zoom_without_redraw();
    };
  });
}

function zoomClick() {
  if (map_div.select('#hand_button').classed('locked')) return;
  const direction = (this.id === 'zoom_in') ? 1 : -1,
    factor = 0.1,
    center = [w / 2, h / 2],
    transform = d3.zoomTransform(svg_map),
    translate = [transform.x, transform.y],
    view = { x: translate[0], y: translate[1], k: transform.k };
  let target_zoom = 1,
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
  const zoom_transform = d3.zoomTransform(svg_map);

  map.selectAll('g.layer')
    .transition()
    .duration(10)
    .attr('transform', `${canvas_rotation_value},translate(${[zoom_transform.x, zoom_transform.y]}),scale(${zoom_transform.k})`);
      // [canvas_rotation_value,
      //                   ',translate(', [zoom_transform.x, zoom_transform.y], '),',
      //                   'scale(', zoom_transform.k, ')'].join(''));
  if (northArrow.displayed) {
    const current_rotate = !isNaN(+northArrow.svg_node.attr('rotate')) ? +northArrow.svg_node.attr('rotate') : 0;
    northArrow.svg_node.attr('transform', `rotate(${+angle + current_rotate},${northArrow.x_center}, ${northArrow.y_center})`);
  }
  zoom_without_redraw();
}

function isInterrupted(proj_name) {
  return (proj_name.indexOf('interrupted') > -1
          || proj_name.indexOf('armadillo') > -1
          || proj_name.indexOf('healpix') > -1);
}

function handleClipPath(proj_name = '', main_layer) {
  const proj_name_lower = proj_name.toLowerCase();
  const defs_sphere = defs.node().querySelector('#sphereClipPath');
  const defs_extent = defs.node().querySelector('#extent');
  const defs_clipPath = defs.node().querySelector('clipPath');
  if (defs_sphere) { defs_sphere.remove(); }
  if (defs_extent) { defs_extent.remove(); }
  if (defs_clipPath) { defs_clipPath.remove(); }

  if (isInterrupted(proj_name_lower)) {
    defs.append('path')
      .datum({ type: 'Sphere' })
      .attr('id', 'sphereClipPath')
      .attr('d', path);

    defs.append('clipPath')
      .attr('id', 'clip')
      .append('use')
      .attr('xlink:href', '#sphereClipPath');

    map.selectAll('.layer:not(.no_clip)')
      .attr('clip-path', 'url(#clip)');

    svg_map.insertBefore(defs.node(), svg_map.childNodes[0]);
  } else if (proj_name_lower.indexOf('conicconformal') > -1) {
    const outline = d3.geoGraticule().extentMajor([[-180, -60], [180, 90]]).outline();

    // proj.fitSize([w, h], outline);
    // proj.scale(s).translate(t)
    // path.projection(proj);

    defs.append('path')
      .attr('id', 'extent')
      .attr('d', path(outline));
    defs.append('clipPath')
      .attr('id', 'clip')
      .append('use')
      .attr('xlink:href', '#extent');

    map.selectAll('.layer:not(.no_clip)')
      .attr('clip-path', 'url(#clip)');
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
    map.selectAll('.layer')
      .attr('clip-path', null);
  }
}

function change_projection(new_proj_name) {
  // Disable the zoom by rectangle selection if the user is using it :
  map.select('.brush').remove();

  // Only keep the first argument of the rotation parameter :
  let prev_rotate = proj.rotate ? [proj.rotate()[0], 0, 0] : [0, 0, 0];
  const def_proj = available_projections.get(new_proj_name);

  // Update global variables:
  // proj = def_proj.custom ? d3.geoProjection(window[def_proj.name]()).scale(def_proj.scale)
  //      : d3[def_proj.name]();
  proj = d3[def_proj.name]();
  if (def_proj.parallels) proj = proj.parallels(def_proj.parallels);
  else if (def_proj.parallel) proj = proj.parallel(def_proj.parallel);
  if (def_proj.clipAngle) proj = proj.clipAngle(def_proj.clipAngle);
  if (def_proj.rotate) prev_rotate = def_proj.rotate;
  if (proj.rotate) proj.rotate(prev_rotate);

  path = d3.geoPath().projection(proj).pointRadius(4);

  // Enable or disable the 'brush zoom' button allowing to zoom according to a rectangle selection:
  document.getElementById('brush_zoom_button').style.display = proj.invert !== undefined ? '' : 'none';

  // Reset the zoom on the targeted layer (or on the top layer if no targeted layer):
  let layer_name = Object.getOwnPropertyNames(user_data)[0];
  if (!layer_name && def_proj.bounds) {
    scale_to_bbox(def_proj.bounds);
  } else if (!layer_name) {
    const layers_active = Array.prototype.filter.call(
      svg_map.querySelectorAll('.layer'), f => f.style.visibility !== 'hidden');
    layer_name = layers_active.length > 0
      ? _app.id_to_layer.get(layers_active[layers_active.length - 1].id)
      : undefined;
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
  const selectProj = document.querySelector('#form_projection2');
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
  const prev_rotate = proj.rotate ? [proj.rotate()[0], 0, 0] : [0, 0, 0];

  proj = getD3ProjFromProj4(_proj);
  path = d3.geoPath().projection(proj).pointRadius(4);

  // Enable or disable the "brush zoom" button allowing to zoom according to a rectangle selection:
  document.getElementById('brush_zoom_button').style.display = proj.invert !== undefined ? '' : 'none';

  // // Reset the zoom on the targeted layer (or on the top layer if no targeted layer):
  let layer_name = Object.getOwnPropertyNames(user_data)[0];
  if (!layer_name) {
    const layers_active = Array.prototype.filter.call(
      svg_map.querySelectorAll('.layer'), f => f.style.visibility !== 'hidden');
    layer_name = layers_active.length > 0
      ? _app.id_to_layer.get(layers_active[layers_active.length - 1].id) : undefined;
  }
  if (!layer_name || layer_name === 'World' || layer_name === 'Sphere' || layer_name === 'Graticule') {
    scale_to_bbox([-10.6700, 34.5000, 31.5500, 71.0500]);
  } else {
    const rv = fitLayer(layer_name);
    s = rv[0];
    t = rv[1];
    if (isNaN(s) || s === 0 || isNaN(t[0]) || isNaN(t[1])) {
      s = 100; t = [0, 0];
      scale_to_bbox([-10.6700, 34.5000, 31.5500, 71.0500]);
    }
  }
  if (isNaN(s) || s === 0 || isNaN(t[0]) || isNaN(t[1])) {
    s = 100; t = [0, 0];
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
  let fill_value,
    parent_div,
    selec,
    at_end;

  if (document.getElementById('info_features').className === 'active') {
    displayInfoOnMove();
    at_end = true;
  }
  if (!name) {
    selec = this;
    parent_div = selec.parentElement;
    name = parent_div.parentElement.getAttribute('layer_name'); // eslint-disable-line no-param-reassign
  } else {
    selec = document.querySelector(`#sortable .${_app.layer_to_id.get(name)} .active_button`);
    parent_div = selec.parentElement;
  }
  const func = () => { handle_active_layer(name); };
  if (selec.id === 'eye_closed') {
    fill_value = 1;
    const eye_open = make_eye_button('open');
    eye_open.onclick = func;
    parent_div.replaceChild(eye_open, selec);
  } else {
    fill_value = 0;
    const eye_closed = make_eye_button('closed');
    eye_closed.onclick = func;
    parent_div.replaceChild(eye_closed, selec);
  }
  map.select(`#${_app.layer_to_id.get(name)}`)
    .style('visibility', fill_value === 0 ? 'hidden' : 'initial');
  map.selectAll(`.lgdf_${_app.layer_to_id.get(name)}`)
    .style('visibility', fill_value === 0 ? 'hidden' : 'initial');

  if (at_end) {
    displayInfoOnMove();
  }
}

// Function to handle the title add and changes
function handle_title(txt) {
  const title = d3.select('#map_title').select('text');
  if (title.node()) {
    title.text(txt);
  } else {
    map.append('g')
      .attrs({ class: 'legend title', id: 'map_title' })
      .style('cursor', 'pointer')
      .insert('text')
      .attrs({ x: w / 2, y: h / 12, 'alignment-baseline': 'middle', 'text-anchor': 'middle' })
      .styles({ 'font-family': 'Arial, Helvetica, sans-serif', 'font-size': '20px', position: 'absolute', color: 'black' })
      .text(txt)
      .on('contextmenu dblclick', () => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        handle_title_properties();
      })
      .call(drag_elem_geo);
  }
}

function handle_title_properties() {
  const title = d3.select('#map_title').select('text');
  if (!title.node() || title.text() === '') {
    swal({
      title: '',
      text: i18next.t('app_page.common.error_no_title'),
      type: 'error',
      allowOutsideClick: true,
      allowEscapeKey: true,
    }).then(() => null, () => null);
    return;
  }
  const title_props = {
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
    stroke_width: title.style('stroke-width'),
  };
  title_props.font_weight = (title_props.font_weight === '400' || title_props.font_weight === '') ? '' : 'bold';
  // Font name don't seems to be formatted in the same way on Firefox and Chrome
  // (a space is inserted after the comma in Chrome so we are removing it)
  title_props.font_family = title_props.font_family ? title_props.font_family.replace(', ', ',') : title_props.font_family;

  // Properties on the title are changed in real-time by the user
  // then it will be rollbacked to original properties if Cancel is clicked
  make_confirm_dialog2('mapTitleitleDialogBox', i18next.t('app_page.title_box.title'), { widthFitContent: true })
    .then((confirmed) => {
      if (!confirmed) {
        title.attrs({ x: title_props.position_x, y: title_props.position_y })
          .styles({
            fill: title_props.color,
            stroke: title_props.stroke,
            'stroke-width': title_props.stroke_width,
            'font-family': title_props.font_family,
            'font-size': title_props.size,
            'font-style': title_props.font_style,
            'font-weight': title_props.font_weight,
            'text-decoration': title_props.text_decoration,
          });
      }
    });
  const box_content = d3.select('.mapTitleitleDialogBox').select('.modal-body').append('div').style('margin', '15x');
  box_content.append('p')
    .html(i18next.t('app_page.title_box.font_size'))
    .insert('input')
    .attrs({ type: 'number', min: 2, max: 40, step: 1, value: +title_props.size.split('px')[0] })
    .style('width', '65px')
    .on('change', function () { title.style('font-size', `${this.value}px`); });
  box_content.append('p')
    .html(i18next.t('app_page.title_box.xpos'))
    .insert('input')
    .attrs({ type: 'number', min: 0, max: 100, step: 1, value: title_props.position_x_pct })
    .style('width', '65px')
    .on('change', function () { title.attr('x', w * +this.value / 100); });
  box_content.append('p')
    .html(i18next.t('app_page.title_box.ypos'))
    .insert('input')
    .attrs({ type: 'number', min: 0, max: 100, step: 1, value: title_props.position_y_pct })
    .style('width', '65px')
    .on('change', function () { title.attr('y', h * +this.value / 100); });
  box_content.append('p').html(i18next.t('app_page.title_box.font_color'))
    .insert('input')
    .attrs({ type: 'color', value: rgb2hex(title_props.color) })
    .on('change', function () { title.style('fill', this.value); });

  const font_select = box_content.append('p')
    .html(i18next.t('app_page.title_box.font_family'))
    .insert('select').attr('class', 'params')
    .on('change', function () { title.style('font-family', this.value); });
  available_fonts.forEach((font) => {
    font_select.append('option').text(font[0]).attr('value', font[1]);
  });
  font_select.node().selectedIndex = available_fonts.map(d => (d[1] === title_props.font_family ? '1' : '0')).indexOf('1');

  const options_format = box_content.append('p'),
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

  const hasBuffer = title_props.stroke !== 'none';
  const buffer_section1 = box_content.append('p');
  const buffer_section2 = box_content.append('p').style('display', hasBuffer ? '' : 'none');
  box_content.append('p').style('clear', 'both');

  buffer_section1.append('input')
    .attrs({ type: 'checkbox', id: 'title_buffer_chkbox', checked: hasBuffer ? true : null })
    .on('change', function () {
      if (this.checked) {
        buffer_section2.style('display', '');
        title.style('stroke', buffer_color.node().value)
          .style('stroke-width', `${buffer_width.node().value}px`);
      } else {
        buffer_section2.style('display', 'none');
        title.style('stroke', 'none')
          .style('stroke-width', '1px');
      }
    });

  buffer_section1.append('label')
    .attrs({ for: 'title_buffer_chkbox' })
    .text(i18next.t('app_page.title_box.buffer'));

  let buffer_color = buffer_section2.insert('input')
    .style('float', 'left')
    .attrs({ type: 'color', value: hasBuffer ? rgb2hex(title_props.stroke) : '#ffffff' })
    .on('change', function () {
      title.style('stroke', this.value);
    });

  buffer_section2.insert('span')
    .style('float', 'right')
    .html(' px');

  let buffer_width = buffer_section2.insert('input')
    .styles({ float: 'right', width: '60px' })
    .attrs({ type: 'number', step: '0.1', value: hasBuffer ? +title_props.stroke_width.replace('px', '') : 1 })
    .on('change', function () {
      title.style('stroke-width', `${this.value}px`);
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
    map.attr('width', w)
      .call(zoom_without_redraw);
    map_div.style('width', `${w}px`);
    if (w + 360 + 30 < window.innerWidth) {
      document.querySelector('.light-menu').style.right = '-30px';
    } else {
      document.querySelector('.light-menu').style.right = '0px';
    }
  }
  if (shape[1]) {
    h = +shape[1];
    map.attr('height', h)
      .call(zoom_without_redraw);
    map_div.style('height', `${h}px`);
  }
  move_legends();

  // Lets update the corresponding fields in the export section :
  let ratio;
  const format = document.getElementById('select_png_format').value;
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
    const elems = [
      svg_map.getElementsByTagName('text'),
      svg_map.getElementsByTagName('p'),
    ];
    const needed_definitions = [];
    // elems.map(d => (d ? d : []));
    elems.map(d => d || []);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < elems[j].length; i++) {
        const font_elem = elems[j][i].style.fontFamily;
        customs_fonts.forEach((font) => {
          if (font_elem.indexOf(font) > -1 && needed_definitions.indexOf(font) === -1) {
            needed_definitions.push(font);
          }
        });
      }
    }
    return needed_definitions;
  }

  const needed_definitions = getListUsedFonts();
  if (needed_definitions.length === 0) {
    return;
  }
  const fonts_definitions = Array.prototype.filter.call(
    document.styleSheets,
    i => (i.href && i.href.indexOf('style-fonts.css') > -1 ? i : null),
    )[0].cssRules;
  const fonts_to_add = needed_definitions.map(
    name => String(fonts_definitions[customs_fonts.indexOf(name)].cssText));
  const style_elem = document.createElement('style');
  style_elem.innerHTML = fonts_to_add.join(' ');
  svg_map.querySelector('defs').appendChild(style_elem);
}

function unpatchSvgForFonts() {
  const defs_style = svg_map.querySelector('defs').querySelector('style');
  if (defs_style) defs_style.remove();
}

function patchSvgForInkscape() {
  svg_map.setAttribute('xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape');
  const elems = svg_map.getElementsByTagName('g');
  for (let i = elems.length - 1; i > -1; i--) {
    if (elems[i].id === '') {
      continue;
    } else if (elems[i].classList.contains('layer')) {
      elems[i].setAttribute('inkscape:label', elems[i].id);
    } else if (elems[i].id.indexOf('legend') > -1) {
      const layer_name = elems[i].className.baseVal.split('lgdf_')[1];
      elems[i].setAttribute('inkscape:label', `legend_${layer_name}`);
    } else {
      elems[i].setAttribute('inkscape:label', elems[i].id);
    }
    elems[i].setAttribute('inkscape:groupmode', 'layer');
  }
}

function unpatchSvgForInkscape() {
  svg_map.removeAttribute('xmlns:inkscape');
  const elems = svg_map.getElementsByTagName('g');
  for (let i = elems.length - 1; i > -1; i--) {
    if (elems[i].id !== '') {
      elems[i].removeAttribute('inkscape:label');
      elems[i].removeAttribute('inkscape:groupmode');
    }
  }
}

function check_output_name(name, extension) {
  const part = name.split('.');
  const regexpName = new RegExp(/^[a-z0-9_]+$/i);
  if (regexpName.test(part[0]) && part[0].length < 250) {
    return `${part[0]}.${extension}`;
  }
  return `export.${extension}`;
}

function patchSvgForForeignObj() {
  const elems = document.getElementsByTagName('foreignObject');
  const originals = [];
  for (let i = 0; i < elems.length; i++) {
    const el = elems[i];
    originals.push([el.getAttribute('width'), el.getAttribute('height')]);
    el.setAttribute('width', '100%');
    el.setAttribute('height', '100%');
  }
  return originals;
}

function unpatchSvgForForeignObj(originals) {
  const elems = document.getElementsByTagName('foreignObject');
  for (let i = 0; i < originals.length; i++) {
    const el = elems[i];
    el.setAttribute('width', originals[i][0]);
    el.setAttribute('height', originals[i][1]);
  }
}

function patchSvgBackground() {
  const background = document.createElement('rect');
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
  const dimensions_foreign_obj = patchSvgForForeignObj();
  const targetSvg = document.getElementById('svg_map'),
    serializer = new XMLSerializer();
  let source = serializer.serializeToString(targetSvg);

  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  source = ['<?xml version="1.0" standalone="no"?>\r\n', source].join('');

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  clickLinkFromDataUrl(url, output_name).then((a) => {
    unpatchSvgForFonts();
    unpatchSvgForForeignObj(dimensions_foreign_obj);
    unpatchSvgForInkscape();
    unpatchSvgBackground();
  }).catch((err) => {
    display_error_during_computation();
    console.log(err);
  });
}

// Maybe PNGs should be rendered on server side in order to avoid limitations that
//   could be encountered in the browser (as 'out of memory' error)
function _export_compo_png(type = 'web', scalefactor = 1, output_name) {
  document.getElementById('overlay').style.display = '';
  output_name = check_output_name(output_name, 'png');
  const dimensions_foreign_obj = patchSvgForForeignObj();
  patchSvgForFonts();
  const targetCanvas = d3.select('body').append('canvas')
    .attrs({ id: 'canvas_map_export', height: h, width: w })
    .node();
  const targetSVG = document.querySelector('#svg_map');
  const mime_type = 'image/png';
  let svg_xml,
    ctx,
    img;

  // At this point it might be better to wrap the whole function in a try catch ?
  // (as it seems it could fail on various points :
  // XMLSerializer()).serializeToString, toDataURL, changeResolution, etc.)
  try {
    svg_xml = (new XMLSerializer()).serializeToString(targetSVG);
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
  let imgUrl;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg_xml)}`;
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
    clickLinkFromDataUrl(imgUrl, output_name).then((_) => {
      unpatchSvgForFonts();
      unpatchSvgForForeignObj(dimensions_foreign_obj);
      document.getElementById('overlay').style.display = 'none';
      targetCanvas.remove();
    }).catch((err) => {
      display_error_during_computation();
      console.log(err);
    });
  };
}

function export_layer_geo(layer, type, projec, proj4str) {
  const formToSend = new FormData();
  formToSend.append('layer', layer);
  formToSend.append('layer_name', current_layers[layer].key_name);
  formToSend.append('format', type);
  if (projec === 'proj4string') {
    formToSend.append('projection', JSON.stringify({ proj4string: proj4str }));
  } else {
    formToSend.append('projection', JSON.stringify({ name: projec }));
  }
  const extensions = new Map([
    ['GeoJSON', 'geojson'],
    ['TopoJSON', 'topojson'],
    ['ESRI Shapefile', 'zip'],
    ['GML', 'zip'],
    ['KML', 'kml']]);

  xhrequest('POST', 'get_layer2', formToSend, true)
    .then((data) => {
      if (data.indexOf('{"Error"') === 0 || data.length === 0) {
        let error_message;
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
          allowEscapeKey: false,
        }).then(() => null,
          () => null);
        return;
      }
      const ext = extensions.get(type),
        filename = [layer, ext].join('.');
      let dataStr;
      if (ext.indexOf('json') > -1) {
        dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(data)}`;
      } else if (ext.indexOf('kml') > -1) {
        dataStr = `data:text/xml;charset=utf-8,${encodeURIComponent(data)}`;
      } else {
        dataStr = `data:application/zip;base64,${data}`;
      }
      clickLinkFromDataUrl(dataStr, filename);
    }, (error) => {
      console.log(error);
    });
}

/*
* Straight from http://stackoverflow.com/a/26047748/5050917
*
*/
function changeResolution(canvas, scaleFactor) {
  // Set up CSS size if it's not set up already
  if (!canvas.style.width) canvas.style.width = `${canvas.width}px`; // eslint-disable-line no-param-reassign
  if (!canvas.style.height) canvas.style.height = `${canvas.height}px`; // eslint-disable-line no-param-reassign

  canvas.width = Math.ceil(canvas.width * scaleFactor); // eslint-disable-line no-param-reassign
  canvas.height = Math.ceil(canvas.height * scaleFactor); // eslint-disable-line no-param-reassign
  const ctx = canvas.getContext('2d');
  ctx.scale(scaleFactor, scaleFactor);
}

function fill_export_png_options(displayed_ratio) {
  const select_size_png = d3.select('#select_png_format');
  select_size_png.selectAll('option').remove();

  select_size_png.append('option')
    .attrs({ value: 'web', class: 'i18n', 'data-i18n': '[text]app_page.section5b.web' });
  select_size_png.append('option')
    .attrs({ value: 'user_defined', class: 'i18n', 'data-i18n': '[text]app_page.section5b.user_defined' });

  if (displayed_ratio === 'portrait') {
    select_size_png.append('option')
      .attrs({ value: 'A5_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A5_portrait' });
    select_size_png.append('option')
      .attrs({ value: 'A4_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A4_portrait' });
    select_size_png.append('option')
      .attrs({ value: 'A3_portrait', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A3_portrait' });
  } else if (displayed_ratio === 'landscape') {
    select_size_png.append('option')
      .attrs({ value: 'A5_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A5_landscape' });
    select_size_png.append('option')
      .attrs({ value: 'A4_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A4_landscape' });
    select_size_png.append('option')
      .attrs({ value: 'A3_landscape', class: 'i18n', 'data-i18n': '[text]app_page.section5b.A3_landscape' });
  }
  localize('#select_png_format > .i18n');
}

let beforeUnloadWindow = (event) => {
  get_map_template().then((jsonParams) => {
    window.localStorage.removeItem('magrit_project');
    window.localStorage.setItem('magrit_project', jsonParams);
  });
  // eslint-disable-next-line no-param-reassign
  event.returnValue = (_app.targeted_layer_added
                          || Object.getOwnPropertyNames(result_data).length > 0)
                      ? 'Confirm exit' : undefined;
};
