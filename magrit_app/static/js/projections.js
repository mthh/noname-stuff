const shortListContent = [
  'AzimuthalEqualAreaEurope',
  'ConicConformalFrance',
  'HEALPix',
  'Mercator',
  'NaturalEarth2',
  'Robinson',
  'TransverseMercator',
  'WinkelTriple',
  'more',
  'proj4',
];

const available_projections = new Map([
  ['Armadillo', { name: 'geoArmadillo', scale: '400', param_in: 'other', param_ex: 'aphylactic' }],
  ['AzimuthalEquidistant', { name: 'geoAzimuthalEquidistant', scale: '700', param_in: 'plan', param_ex: 'equidistant' }],
  ['AzimuthalEqualArea', { name: 'geoAzimuthalEqualArea', scale: '700', param_in: 'plan', param_ex: 'equalarea' }],
  ['AzimuthalEqualAreaEurope', { name: 'geoAzimuthalEqualArea', scale: '700', rotate: [-10, -52, 0], bounds: [-10.6700, 34.5000, 31.5500, 71.0500], param_in: 'plan', param_ex: 'equalarea' }],
  ['Baker', { name: 'geoBaker', scale: '400', param_in: 'other', param_ex: 'aphylactic' }],
  ['Berhmann', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 30, param_in: 'cylindrical', param_ex: 'equalarea' }],
  ['Boggs', { name: 'geoBoggs', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['InterruptedBoggs', { name: 'geoInterruptedBoggs', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Bonne', { name: 'geoBonne', scale: '400', param_in: 'pseudocone', param_ex: 'equalarea' }],
  ['Bromley', { name: 'geoBromley', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Collignon', { name: 'geoCollignon', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  // ["ConicConformalTangent", {'name': 'geoConicConformal', 'scale': '400', 'parallels': [44, 44], bounds: [-25.5, -25.5, 75.5, 75.5], param_in: 'cone', param_ex: 'conformal'}],
  ['ConicConformal', { name: 'geoConicConformal', scale: '400', parallels: [44, 49], bounds: [-25.5, -25.5, 75.5, 75.5], param_in: 'cone', param_ex: 'conformal' }],
  ['ConicConformalFrance', { name: 'geoConicConformal', scale: '400', parallels: [44, 49], rotate: [-3, -46.5, 0], bounds: [-10.6700, 34.5000, 31.5500, 71.0500], param_in: 'cone', param_ex: 'conformal' }],
  ['ConicEqualArea', { name: 'geoConicEqualArea', scale: '400', param_in: 'cone', param_ex: 'equalarea' }],
  ['ConicEquidistant', { name: 'geoConicEquidistant', scale: '400', parallels: [40, 45], param_in: 'cone', param_ex: 'equidistant' }],
  // ["ConicEquidistantTangent", {'name': 'geoConicEquidistant', 'scale': '400', parallels: [40, 40], param_in: 'cone', param_ex: 'equidistant'}],
  ['CrasterParabolic', { name: 'geoCraster', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Equirectangular', { name: 'geoEquirectangular', scale: '400', param_in: 'cylindrical', param_ex: 'equidistant' }],
  ['CylindricalEqualArea', { name: 'geoCylindricalEqualArea', scale: '400', param_in: 'cylindrical', param_ex: 'equalarea' }],
  ['CylindricalStereographic', { name: 'geoCylindricalStereographic', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }],
  ['EckertI', { name: 'geoEckert1', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['EckertII', { name: 'geoEckert2', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['EckertIII', { name: 'geoEckert3', scale: '525', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['EckertIV', { name: 'geoEckert4', scale: '525', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['EckertV', { name: 'geoEckert5', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['EckertVI', { name: 'geoEckert6', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Eisenlohr', { name: 'geoEisenlohr', scale: '400', param_in: 'other', param_ex: 'conformal' }],
  ['GallPeters', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 45, param_in: 'cylindrical', param_ex: 'equalarea' }],
  ['GallStereographic', { name: 'geoCylindricalStereographic', scale: '400', parallel: 45, param_in: 'cylindrical', param_ex: 'aphylactic' }],
  ['Gilbert', { name: 'geoGilbert', scale: '400', type: '', param_in: 'other', param_ex: 'aphylactic' }],
  ['Gnomonic', { name: 'geoGnomonic', scale: '400', param_in: 'plan', param_ex: 'aphylactic' }],
  ['Gringorten', { name: 'geoGringorten', scale: '400', param_in: 'other', param_ex: 'equalarea' }],
  ['GringortenQuincuncial', { name: 'geoGringortenQuincuncial', scale: '400', param_in: 'other', param_ex: 'equalarea' }],
  ['Hatano', { name: 'geoHatano', scale: '200', param_in: 'other', param_ex: 'equalarea' }],
  ['HEALPix', { name: 'geoHealpix', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['HoboDyer', { name: 'geoCylindricalEqualArea', scale: '400', parallel: 37.5, param_in: 'cylindrical', param_ex: 'equalarea' }],
  ['Homolosine', { name: 'geoHomolosine', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['InterruptedHomolosine', { name: 'geoInterruptedHomolosine', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Loximuthal', { name: 'geoLoximuthal', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['Mercator', { name: 'geoMercator', scale: '375', param_in: 'cylindrical', param_ex: 'conformal' }],
  ['Miller', { name: 'geoMiller', scale: '375', param_in: 'cylindrical', param_ex: 'aphylactic' }],
  ['MillerOblatedStereographic', { name: 'geoModifiedStereographicMiller', scale: '375', param_in: 'plan', param_ex: 'conformal' }],
  ['Mollweide', { name: 'geoMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['NaturalEarth', { name: 'geoNaturalEarth', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['NaturalEarth2', { name: 'geoNaturalEarth2', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['Orthographic', { name: 'geoOrthographic', scale: '475', clipAngle: 90, param_in: 'plan', param_ex: 'aphylactic' }],
  ['Patterson', { name: 'geoPatterson', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }],
  ['Polyconic', { name: 'geoPolyconic', scale: '400', param_in: 'pseudocone', param_ex: 'aphylactic' }],
  ['Peircequincuncial', { name: 'geoPeirceQuincuncial', scale: '400', param_in: 'other', param_ex: 'conformal' }],
  ['Robinson', { name: 'geoRobinson', scale: '400', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['SinuMollweide', { name: 'geoSinuMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['InterruptedSinuMollweide', { name: 'geoInterruptedSinuMollweide', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Sinusoidal', { name: 'geoSinusoidal', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['InterruptedSinusoidal', { name: 'geoInterruptedSinusoidal', scale: '400', param_in: 'pseudocylindre', param_ex: 'equalarea' }],
  ['Stereographic', { name: 'geoStereographic', scale: '400', param_in: 'cylindrical', param_ex: 'aphylactic' }],
  ['TransverseMercator', { name: 'geoTransverseMercator', scale: '400', param_in: 'cylindrical', param_ex: 'conformal' }],
  ['Werner', { name: 'geoBonne', scale: '400', parallel: 90, param_in: 'pseudocone', param_ex: 'equalarea' }],
  ['Winkel1', { name: 'geoWinkel1', scale: '200', param_in: 'pseudocylindre', param_ex: 'aphylactic' }],
  ['WinkelTriple', { name: 'geoWinkel3', scale: '400', param_in: 'pseudoplan', param_ex: 'aphylactic' }],
]);

const createBoxProj4 = function createBoxProj4() {
  make_dialog_container(
    'box_projection_input',
    i18next.t('app_page.section5.title'),
    'dialog');
  const container = document.getElementById('box_projection_input');
  const dialog = container.querySelector('.modal-dialog');

  const content = d3.select(container)
    .select('.modal-body')
    .attr('id', 'box_proj4');

  dialog.style.width = undefined;
  dialog.style.maxWidth = '500px';
  dialog.style.minWidth = '400px';

  const input_section = content.append('p');
  input_section.append('span')
    .style('float', 'left')
    .html(i18next.t('app_page.proj4_box.enter_string'));
  input_section.append('input')
    .styles({ width: '90%' })
    .attrs({
      id: 'input_proj_string',
      placeholder: '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs',
    });

  const fn_cb = (evt) => { helper_esc_key_twbs_cb(evt, clean_up_box); };
  const clean_up_box = () => {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };
  const _onclose_valid = () => {
    let proj_str = document.getElementById('input_proj_string').value.trim();
    let _p;
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
        allowEscapeKey: false,
      }).then(() => null, () => null);
      return;
    }
    const rv = change_projection_4(_p);
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
        allowEscapeKey: false,
      }).then(() => null, () => null);
    }
  };
  container.querySelector('.btn_cancel').onclick = clean_up_box;
  container.querySelector('#xclose').onclick = clean_up_box;
  container.querySelector('.btn_ok').onclick = _onclose_valid;
  document.addEventListener('keydown', fn_cb);
  overlay_under_modal.display();
};

const displayTooltipProj4 = function displayTooltipProj4(ev) {
  const target = ev.target;
  if (!(target && target.tagName === 'SELECT' && target.value === 'last_projection')) {
    return;
  }
  const title = target.tooltip;
  const tooltipWrap = document.createElement('div');
  tooltipWrap.className = 'custom_tooltip';
  tooltipWrap.appendChild(document.createTextNode(title));

  const firstChild = document.body.firstChild;
  firstChild.parentNode.insertBefore(tooltipWrap, firstChild);

  const linkProps = this.getBoundingClientRect();
  const tooltipProps = tooltipWrap.getBoundingClientRect();
  const topPos = linkProps.bottom - tooltipProps.height / 2;
  tooltipWrap.setAttribute('style', `top: ${topPos}px; left: ${linkProps.right - 15}px;`);
};

const removeTooltipProj4 = function removeTooltipProj4(ev) {
  const target = ev.target;
  if (!(target && target.tagName === 'SELECT' && target.value === 'last_projection')) {
    return;
  }
  const a = document.querySelector('div.custom_tooltip');
  if (a) a.remove();
};

const makeTooltipProj4 = (proj_select, proj4string) => {
  proj_select.tooltip = proj4string; // eslint-disable-line no-param-reassign
  proj_select.addEventListener('mouseover', displayTooltipProj4);
  proj_select.addEventListener('mouseout', removeTooltipProj4);
};

function addLastProjectionSelect(proj_name, proj4string) {
  const proj_select = document.getElementById('form_projection2');
  if (shortListContent.indexOf(proj_name) > -1) {
    proj_select.value = proj_name;
  } else if (proj_select.options.length === 10) {
    const prev_elem = proj_select.querySelector("[value='more']"),
      new_option = document.createElement('option');
    new_option.className = 'i18n';
    new_option.value = 'last_projection';
    new_option.name = proj_name;
    new_option.setAttribute('data-i18n', `[text]app_page.projection_name.${proj_name}`);
    new_option.innerHTML = i18next.t(`app_page.projection_name.${proj_name}`);
    proj_select.insertBefore(new_option, prev_elem);
    proj_select.value = 'last_projection';
    if (proj4string) {
      makeTooltipProj4(proj_select, proj4string);
    }
  } else {
    const option = proj_select.querySelector("[value='last_projection']");
    option.name = proj_name;
    option.innerHTML = i18next.t(`app_page.projection_name.${proj_name}`);
    option.setAttribute('data-i18n', `[text]app_page.projection_name.${proj_name}`);
    proj_select.value = 'last_projection';
    if (proj4string) {
      makeTooltipProj4(proj_select, proj4string);
    }
  }
}

const createBoxCustomProjection = function createBoxCustomProjection() {
  function updateSelect(filter_in, filter_ex) {
    display_select_proj.remove();
    display_select_proj = p.append('select')
      .attr('id', 'select_proj')
      .attr('size', 18);
    if (!filter_in && !filter_ex) {
      // for (const proj_name of available_projections.keys()) { .. }
      Array.from(available_projections.keys()).forEach((proj_name) => {
        display_select_proj.append('option')
          .attrs({ class: 'i18n', value: proj_name, 'data-i18n': `app_page.projection_name.${proj_name}` })
          .text(i18next.t(`app_page.projection_name.${proj_name}`));
      });
    } else if (!filter_ex) {
      available_projections.forEach((v, k) => {
        if (v.param_in === filter_in) {
          display_select_proj.insert('option')
            .attrs({ class: 'i18n', value: k })
            .text(i18next.t(`app_page.projection_name.${k}`));
        }
      });
    } else if (!filter_in) {
      available_projections.forEach((v, k) => {
        if (v.param_ex === filter_ex) {
          display_select_proj.append('option')
            .attrs({ class: 'i18n', value: k })
            .text(i18next.t(`app_page.projection_name.${k}`));
        }
      });
    } else {
      let empty = true;
      available_projections.forEach((v, k) => {
        if (v.param_in === filter_in && v.param_ex === filter_ex) {
          empty = false;
          display_select_proj.append('option')
            .attrs({ class: 'i18n', value: k })
            .text(i18next.t(`app_page.projection_name.${k}`));
        }
      });
      if (empty) {
        display_select_proj.append('option')
          .attrs({ class: 'i18n', value: 'no_result' })
          .html(i18next.t('app_page.projection_box.no_result_projection'));
      }
    }
    display_select_proj.on('dblclick', function () {
      if (this.value === 'no_result') return;
      reproj(this.value);
    });
  }
  function onClickFilter() {
    let filter1_val = Array.prototype.filter.call(document.querySelector('.switch-field.f1').querySelectorAll('input'), f => f.checked)[0];
    filter1_val = filter1_val === undefined ? undefined : filter1_val.value;
    if (filter1_val === 'any') filter1_val = undefined;
    let filter2_val = Array.prototype.filter.call(document.querySelector('.switch-field.f2').querySelectorAll('input'), f => f.checked)[0];
    filter2_val = filter2_val === undefined ? undefined : filter2_val.value;
    if (filter2_val === 'any') filter2_val = undefined;
    updateSelect(filter1_val, filter2_val);
  }
  function updateProjOptions() {
    if (proj.rotate) {
      rotate_section.style('display', '');
      const param_rotate = proj.rotate();
      lambda_input.node().value = -param_rotate[0];
      phi_input.node().value = -param_rotate[1];
      gamma_input.node().value = -param_rotate[2];
    } else {
      rotate_section.style('display', 'none');
    }
    if (proj.parallels) {
      const param_parallels = proj.parallels();
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

  const prev_projection = current_proj_name,
    prev_translate = [].concat(t),
    prev_scale = s,
    prev_rotate = proj.rotate ? proj.rotate() : undefined,
    prev_parallels = proj.parallels ? proj.parallels() : undefined,
    prev_parallel = proj.parallel ? proj.parallel() : undefined;

  const modal_box = make_dialog_container(
      'box_projection_customization',
      i18next.t('app_page.section5.title'),
      'dialog');
  const container = document.getElementById('box_projection_customization'),
    dialog = container.querySelector('.modal-dialog');

  const content = d3.select(container)
    .select('.modal-body')
    .attr('id', 'box_projection');

  dialog.style.width = '700px';

  const choice_proj = content.append('button')
    .attrs({ class: 'accordion_proj active', id: 'btn_choice_proj' })
    .style('padding', '0 6px')
    .html(i18next.t('app_page.projection_box.choice_projection'));
  const accordion_choice_projs = content.append('div')
    .attrs({ class: 'panel show', id: 'accordion_choice_projection' })
    .style('padding', '10px')
    .style('width', '98%');
  const choice_proj_content = accordion_choice_projs.append('div')
    .attr('id', 'choice_proj_content')
    .style('text-align', 'center');

  const column1 = choice_proj_content.append('div')
    .styles({ float: 'left', width: '50%' });
  const column3 = choice_proj_content.append('div')
    .styles({ float: 'right', width: '45%' });
  const column2 = choice_proj_content.append('div')
    .styles({ float: 'left', width: '50%' });
  choice_proj_content.append('div')
    .style('clear', 'both');

  const filtersection1 = column1.append('div').attr('class', 'switch-field f1');
  filtersection1.append('div')
    .attrs({ class: 'switch-title' })
    .html(i18next.t('app_page.projection_box.filter_nature'));
  ['any', 'other', 'cone', 'cylindrical', 'plan', 'pseudocone', 'pseudocylindre', 'pseudoplan'].forEach((v, i) => {
    const _id = `switch_proj1_elem_${i}`;
    filtersection1.append('input')
      .attrs({ type: 'radio', id: _id, class: 'filter1', name: 'switch_proj1', value: v });
    filtersection1.append('label')
      .attr('for', _id)
      .html(i18next.t(`app_page.projection_box.${v}`));
  });

  const filtersection2 = column2.append('div').attr('class', 'switch-field f2');
  filtersection2.append('div')
    .attrs({ class: 'switch-title' })
    .html(i18next.t('app_page.projection_box.filter_prop'));
  ['any', 'aphylactic', 'conformal', 'equalarea', 'equidistant'].forEach((v, i) => {
    const _id = `switch_proj2_elem_${i}`;
    filtersection2.append('input')
      .attrs({ type: 'radio', id: _id, class: 'filter2', name: 'switch_proj2', value: v });
    filtersection2.append('label')
      .attr('for', _id)
      .html(i18next.t(`app_page.projection_box.${v}`));
  });

  Array.prototype.forEach.call(
    document.querySelectorAll('.filter1,.filter2'),
    (el) => { el.onclick = onClickFilter; }); // eslint-disable-line no-param-reassign

  const p = column3.append('p').style('margin', 'auto');
  let display_select_proj = p.append('select')
    .attr('id', 'select_proj')
    .attr('size', 18);

  updateSelect(null, null);

  column3.append('button')
    .style('margin', '5px 0 5px 0')
    .attrs({ id: 'btn_valid_reproj', class: 'button_st4 i18n' })
    .html(i18next.t('app_page.projection_box.ok_reproject'))
    .on('click', () => {
      const value = document.getElementById('select_proj').value;
      if (value === 'no_result') return;
      reproj(value);
    });

  const choice_options = content.append('button')
    .attrs({ class: 'accordion_proj', id: 'btn_choice_proj' })
    .style('padding', '0 6px')
    .html(i18next.t('app_page.projection_box.projection_options'));
  const accordion_choice_options = content.append('div')
    .attrs({ class: 'panel', id: 'accordion_choice_projection' })
    .style('padding', '10px')
    .style('width', '98%');
  const options_proj_content = accordion_choice_options.append('div')
    .attr('id', 'options_proj_content')
    .style('width', '60%')
    .style('transform', 'translateX(45%)');

  let rotate_section = options_proj_content.append('div').style('display', prev_rotate ? '' : 'none');
  const lambda_section = rotate_section.append('p');
  lambda_section.append('span')
    .style('float', 'left')
    .html(i18next.t('app_page.section5.projection_center_lambda'));
  let lambda_input = lambda_section.append('input')
    .styles({ width: '60px', float: 'right' })
    .attrs({ type: 'number', value: prev_rotate ? -prev_rotate[0] : 0, min: -180, max: 180, step: 0.50 })
    .on('input', function () {
      if (this.value > 180) this.value = 180;
      else if (this.value < -180) this.value = -180;
      handle_proj_center_button([-this.value, null, null]);
    });

  const phi_section = rotate_section.append('p')
    .style('clear', 'both');
  phi_section.append('span')
    .style('float', 'left')
    .html(i18next.t('app_page.section5.projection_center_phi'));
  let phi_input = phi_section.append('input')
    .styles({ width: '60px', float: 'right' })
    .attrs({ type: 'number', value: prev_rotate ? -prev_rotate[1] : 0, min: -180, max: 180, step: 0.5 })
    .on('input', function () {
      if (this.value > 180) { this.value = 180; } else if (this.value < -180) { this.value = -180; }
      handle_proj_center_button([null, -this.value, null]);
    });

  const gamma_section = rotate_section.append('p')
    .style('clear', 'both');
  gamma_section.append('span')
    .style('float', 'left')
    .html(i18next.t('app_page.section5.projection_center_gamma'));
  let gamma_input = gamma_section.append('input')
    .styles({ width: '60px', float: 'right' })
    .attrs({ type: 'number', value: prev_rotate ? -prev_rotate[2] : 0, min: -90, max: 90, step: 0.5 })
    .on('input', function () {
      if (this.value > 90) { this.value = 90; } else if (this.value < -90) { this.value = -90; }
      handle_proj_center_button([null, null, -this.value]);
    });

  let parallels_section = options_proj_content.append('div')
    .styles({ 'text-align': 'center', clear: 'both' })
    .style('display', prev_parallels ? '' : 'none');
  parallels_section.append('span')
    .html(i18next.t('app_page.section5.parallels'));
  const inputs = parallels_section.append('p')
    .styles({ 'text-align': 'center', margin: 'auto' });
  let sp1_input = inputs.append('input')
    .styles({ width: '60px', display: 'inline', 'margin-right': '2px' })
    .attrs({ type: 'number', value: prev_parallels ? prev_parallels[0] : 0, min: -90, max: 90, step: 0.5 })
    .on('input', function () {
      if (this.value > 90) this.value = 90;
      else if (this.value < -90) this.value = -90;
      handle_parallels_change([this.value, null]);
    });
  let sp2_input = inputs.append('input')
    .styles({ width: '60px', display: 'inline', 'margin-left': '2px' })
    .attrs({ type: 'number', value: prev_parallels ? prev_parallels[1] : 0, min: -90, max: 90, step: 0.5 })
    .on('input', function () {
      if (this.value > 90) this.value = 90;
      else if (this.value < -90) this.value = -90;
      handle_parallels_change([null, this.value]);
    });

  let parallel_section = options_proj_content.append('div')
    .styles({ 'text-align': 'center', clear: 'both' })
    .style('display', prev_parallel ? '' : 'none');
  parallel_section.append('span')
    .html(i18next.t('app_page.section5.parallel'));

  let sp_input = parallel_section.append('p')
    .styles({ 'text-align': 'center', margin: 'auto' })
    .append('input')
    .styles({ width: '60px', display: 'inline', 'margin-right': '2px' })
    .attrs({ type: 'number', value: prev_parallel || 0, min: -90, max: 90, step: 0.5 })
    .on('input', function () {
      if (this.value > 90) this.value = 90;
      else if (this.value < -90) this.value = -90;
      handle_parallel_change(this.value);
    });

  if (prev_projection === 'def_proj4') {
    options_proj_content.selectAll('input')
      .attr('disabled', 'disabled');
    options_proj_content.selectAll('span')
      .styles({ color: 'darkgrey', 'font-style': 'italic' });
  }

  accordionize2('.accordion_proj', container);
  const clean_up_box = () => {
    container.remove();
    overlay_under_modal.hide();
    document.removeEventListener('keydown', fn_cb);
  };
  let fn_cb = (evt) => { helper_esc_key_twbs_cb(evt, _onclose_cancel); };
  let _onclose_cancel = () => {
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
  const current_rotation = proj.rotate();
  // Reuse it for the missing value passed in arguments and do the rotation:
  // proj.rotate(param.map((val, i) => val !== null ? val : current_rotation[i]));
  proj.rotate(param.map((val, i) => val || current_rotation[i]));
  // Redraw the path and move the symbols :
  map.selectAll('.layer').selectAll('path').attr('d', path);
  reproj_symbol_layer();
}

function handle_parallels_change(parallels) {
  const current_values = proj.parallels();
  proj.parallels(parallels.map((val, i) => val || current_values[i]));
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
const getD3ProjFromProj4 = function getD3ProjFromProj4(_proj) {
  // Create the custom d3 projection using proj 4 forward and inverse functions:
  const projRaw = function (lambda, phi) {
    return _proj.forward([lambda * 57.29577951308232, phi * 57.29577951308232]);
  };
  projRaw.invert = function (x, y) {
    const p = _proj.inverse([x, y]);
    return [p[0] * 0.017453292519943295, p[1] * 0.017453292519943295];
  };
  return d3.geoProjection(projRaw);
};
