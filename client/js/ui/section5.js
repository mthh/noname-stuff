import { Mround } from './../helpers_math';
import { export_compo_png, export_compo_svg, export_layer_geo, export_to_code } from './../map_export';


export function makeSection5() {
  const section5b = d3.select('#section5');
  const dv5b = section5b.append('div');

  const type_export = dv5b.append('p');
  type_export.append('span')
    .attrs({
      class: 'i18n', 'data-i18n': '[html]app_page.section5b.type',
    });
  const select_type_export = type_export.append('select')
    .attrs({ id: 'select_export_type', class: 'm_elem_right' })
    .on('change', function () {
      const type = this.value,
        export_filename = document.getElementById('export_filename');
      if (type === 'svg') {
        document.getElementById('export_options_svg').style.display = '';
        document.getElementById('export_options_geo').style.display = 'none';
        document.getElementById('export_options_png').style.display = 'none';
        document.getElementById('export_options_web').style.display = 'none';
        export_filename.value = 'export.svg';
        export_filename.style.display = '';
        export_filename.previousSibling.style.display = '';
        ok_button.html(_tr('app_page.section5b.export_button'));
      } else if (type === 'png') {
        document.getElementById('export_options_svg').style.display = 'none';
        document.getElementById('export_options_geo').style.display = 'none';
        document.getElementById('export_options_png').style.display = '';
        document.getElementById('export_options_web').style.display = 'none';
        export_filename.value = 'export.png';
        export_filename.style.display = '';
        export_filename.previousSibling.style.display = '';
        ok_button.html(_tr('app_page.section5b.export_button'));
      } else if (type === 'geo') {
        document.getElementById('export_options_svg').style.display = 'none';
        document.getElementById('export_options_png').style.display = 'none';
        document.getElementById('export_options_geo').style.display = '';
        document.getElementById('export_options_web').style.display = 'none';
        export_filename.style.display = 'none';
        export_filename.previousSibling.style.display = 'none';
        ok_button.html(_tr('app_page.section5b.export_button'));
      } else if (type === 'web') {
        document.getElementById('export_options_svg').style.display = 'none';
        document.getElementById('export_options_png').style.display = 'none';
        document.getElementById('export_options_geo').style.display = 'none';
        document.getElementById('export_options_web').style.display = '';
        export_filename.style.display = 'none';
        export_filename.previousSibling.style.display = 'none';
        ok_button.html('...');
      }
    });

  select_type_export.append('option').text('SVG').attr('value', 'svg');
  select_type_export.append('option').text('PNG').attr('value', 'png');
  select_type_export.append('option').text('GEO').attr('value', 'geo');
  select_type_export.append('option').text('WEB').attr('value', 'web');

  const export_svg_options = dv5b.append('p')
    .attr('id', 'export_options_svg')
    .style('padding-top', '10px');

  export_svg_options.append('label')
    .attrs({
      class: 'i18n',
      'data-i18n': '[html]app_page.section5b.clip_svg_export',
      for: 'clip_svg_export',
    });

  export_svg_options.append('input')
    .attrs({
      id: 'clip_svg_export',
      type: 'checkbox',
    })
    .styles({
      float: 'right',
      margin: 'auto',
    })
    .property('checked', true);

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
      in_h.value = Mround(h / 118.11 * 10) / 10;
      in_w.value = Mround(w / 118.11 * 10) / 10;
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

  const exp_a = export_png_options.append('p').style('margin', '20px 0');
  exp_a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.width' });

  exp_a.append('input')
    .style('width', '60px')
    .attrs({
      id: 'export_png_width', class: 'm_elem_right', type: 'number', step: 0.1,
    })
    .property('value', w)
    .on('change', function () {
      const ratio = h / w,
        export_png_height = document.getElementById('export_png_height');
      export_png_height.value = Mround(+this.value * ratio * 10) / 10;
    });

  exp_a.append('span')
    .attr('id', 'export_png_width_txt')
    .html(' (px)');

  const exp_b = export_png_options.append('p').style('margin', '20px 0');
  exp_b.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.height' });

  exp_b.append('input')
    .style('width', '60px')
    .attrs({
      id: 'export_png_height', class: 'm_elem_right', type: 'number', step: 0.1,
    })
    .property('value', h)
    .on('change', function () {
      const ratio = h / w,
        export_png_width = document.getElementById('export_png_width');
      export_png_width.value = Mround(+this.value / ratio * 10) / 10;
    });

  exp_b.append('span')
    .attr('id', 'export_png_height_txt')
    .html(' (px)');

  const export_name = dv5b.append('p');
  export_name.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.section5b.filename' });

  export_name.append('input')
    .attrs({ id: 'export_filename', class: 'm_elem_right', type: 'text' })
    .property('value', 'export.svg');

  const export_geo_options = dv5b.append('p')
    .attr('id', 'export_options_geo')
    .style('display', 'none');

  const geo_a = export_geo_options.append('p')
    .style('margin', '5px 5px 40px 0');
  geo_a.append('span')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_layer' });

  geo_a.insert('select')
    .styles({ margin: '20px 0', 'max-width': '280px' })
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
  const geo_c = export_geo_options.append('p')
    .style('margin', '5px 5px 30px 5px');
  const selec_projection = geo_c.insert('select')
    .styles({
      float: 'right', 'font-size': '10.5px',
    })
    .attrs({ id: 'projection_to_use', disabled: true, class: 'i18n m_elem_right' });

  const proj4_input = export_geo_options.append('p')
    .style('margin', 'auto')
    .insert('input')
    .attr('id', 'proj4str')
    .styles({
      display: 'none',
      width: '275px',
      position: 'relative',
      float: 'right',
      'margin-right': '5px',
      'font-size': '10.5px',
    });

  const export_web_options = dv5b.append('p')
    .attr('id', 'export_options_web')
    .style('display', 'none');

  const zoomable_section = export_web_options.append('p')
    .style('margin', '25px 0 10px 0');
  zoomable_section.append('input')
    .styles({ float: 'right' })
    .attrs({ id: 'zoomable_web_export', type: 'checkbox' })
    .property('checked', true);
  zoomable_section.append('label')
    .attrs({
      class: 'i18n',
      'data-i18n': '[html]app_page.export_box.option_zoomable_export',
      for: 'zoomable_web_export',
    })
    .html('Activer le zoom');

  const web_layer_tooltip = export_web_options.append('div')
    .style('clear', 'both');
    // .style('margin', '5px 5px 10px 0');
  web_layer_tooltip.append('p')
    .style('margin', 'auto')
    .attrs({ class: 'i18n', 'data-i18n': '[html]app_page.export_box.option_layer_tooltip' })
    .html('Couche sur laquelle afficher un tooltip');
  web_layer_tooltip.append('p')
    .style('margin', '5px 5px 30px')
    .append('select')
    .styles({ margin: '0 0 10px 0', 'max-width': '280px', float: 'right' })
    .attrs({ id: 'layer_for_tooltip' })
    .on('change', function() {
      const layer_name = this.value;
      const layer_id = _app.layer_to_id.get(layer_name);
      const fields = Object.keys(document.querySelector(`g#${layer_id}`).querySelector('*').__data__.properties);
      console.log(fields);
      const select1 = d3.select('#field_for_tooltip');
      const select2 = d3.select('#id_field_for_tooltip');
      select1.selectAll('option').remove();
      select2.selectAll('option').remove();
      select1.append('option').attr('value', 'none').text('None');
      select2.append('option').attr('value', 'none').text('None');
      fields.forEach((field) => {
        select1.append('option').attr('value', field).text(field);
        select2.append('option').attr('value', field).text(field);
      });
    });

  const web_field_tooltip = export_web_options.append('div')
    .style('clear', 'both');
    // .style('margin', '5px 5px 20px 0');
  web_field_tooltip.append('p')
    .style('margin', 'auto')
    .attrs({ class: 'i18', 'data-i18n': '[html]app_page.export_box.option_field_tooltip' })
    .html('Champ contenant la valeur à afficher');
  web_field_tooltip.append('p')
    .style('margin', '5px 5px 30px')
    .append('select')
    .styles({ margin: '0 0 10px 0', 'max-width': '280px', float: 'right' })
    .attrs({ id: 'field_for_tooltip' });

  const web_id_field_tooltip = export_web_options.append('div')
    .style('clear', 'both');
    // .style('margin', '5px 5px 20px 0');
  web_id_field_tooltip.append('p')
    .style('margin', 'auto')
    .attrs({ class: 'i18', 'data-i18n': '[html]app_page.export_box.option_field_tooltip' })
    .html('Champ contenant le nom / l\'id de l\'entité');
  web_id_field_tooltip.append('p')
    .style('margin', '5px 5px 30px')
    .append('select')
    .styles({ margin: '0 0 10px 0', 'max-width': '280px', float: 'right' })
    .attrs({ id: 'id_field_for_tooltip' });

  const ok_button = dv5b.append('p').style('float', 'left')
    .append('button')
    .attrs({
      id: 'export_button_section5b',
      class: 'i18n button_st4',
      'data-i18n': '[html]app_page.section5b.export_button',
    });

  proj4_input.on('keyup', function () {
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
      .text(_tr(projection[0]));
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

  ok_button.on('click', () => {
    const type_exp = document.getElementById('select_export_type').value;
    const exp_name = document.getElementById('export_filename').value;

    if (type_exp === 'svg') {
      const clip_svg = !!document.getElementById('clip_svg_export').checked;
      export_compo_svg(exp_name, clip_svg);
    } else if (type_exp === 'geo') {
      const layer_name = document.getElementById('layer_to_export').value,
        type = document.getElementById('datatype_to_use').value,
        proj = document.getElementById('projection_to_use').value,
        proj4value = document.getElementById('proj4str').value;
      export_layer_geo(layer_name, type, proj, proj4value);
    } else if (type_exp === 'png') {
      const exp_format = document.getElementById('select_png_format').value;
      const exp_height = +document.getElementById('export_png_height').value;
      let ratio;
      if (exp_format === 'web') {
        ratio = exp_height / +h;
      } else {
        ratio = (exp_height * 118.11) / +h;
      }
      export_compo_png(ratio, exp_name);
    } else if (type_exp === 'web') {
      const layer_name = document.getElementById('layer_for_tooltip').value;
      const field_name = document.getElementById('field_for_tooltip').value;
      const id_field_name = document.getElementById('id_field_for_tooltip').value;
      const zoomable = !!document.getElementById('zoomable_web_export').checked;
      export_to_code({
        layer_name,
        field_name,
        id_field_name,
        zoomable,
      });
    }
  });
}

export function fill_export_png_options(displayed_ratio) {
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
