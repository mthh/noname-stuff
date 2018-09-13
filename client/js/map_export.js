import { clickLinkFromDataUrl, display_error_during_computation, xhrequest } from './helpers';
import { Mceil } from './helpers_math';
import { custom_fonts } from './fonts';
import { reproj_symbol_layer } from './map_ctrl';
import { make_confirm_dialog2 } from './dialogs';

function patchSvgForFonts() {
  function getListUsedFonts() {
    const elems = [
      svg_map.getElementsByTagName('text'),
      svg_map.getElementsByTagName('p'),
    ];
    const needed_definitions = [];
    elems.map(d => d || []);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < elems[j].length; i++) {
        const font_elem = elems[j][i].style.fontFamily;
        custom_fonts.forEach((font) => {
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
  const fonts_to_add = needed_definitions
    .map(name => String(fonts_definitions[custom_fonts.indexOf(name)].cssText));
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
  d3.select(svg_map)
    .insert('g', 'defs')
    .attr('id', 'G_bg')
    .insert('rect')
    .attrs({
      id: 'background',
      width: w,
      height: h,
      x: 0,
      y: 0,
    })
    .style('fill', document.getElementById('bg_color').value);
}

function unpatchSvgBackground() {
  svg_map.querySelector('#G_bg').remove();
}

function check_output_name(name, extension) {
  const _name = name.toLowerCase().indexOf(extension) > -1
    ? name.substring(0, name.lastIndexOf('.'))
    : name;
  const regexpName = new RegExp(/^[().a-z0-9_-]+$/i);
  if (regexpName.test(_name) && _name.length < 250) {
    return `${_name}.${extension}`;
  }
  return `export.${extension}`;
}

/*
* Straight from http://stackoverflow.com/a/26047748/5050917
*
*/
function changeResolution(canvas, scaleFactor) {
  // Set up CSS size if it's not set up already
  if (!canvas.style.width) canvas.style.width = `${canvas.width}px`; // eslint-disable-line no-param-reassign
  if (!canvas.style.height) canvas.style.height = `${canvas.height}px`; // eslint-disable-line no-param-reassign

  canvas.width = Mceil(canvas.width * scaleFactor); // eslint-disable-line no-param-reassign
  canvas.height = Mceil(canvas.height * scaleFactor); // eslint-disable-line no-param-reassign
  const ctx = canvas.getContext('2d');
  ctx.scale(scaleFactor, scaleFactor);
}

export function export_compo_svg(output_name, clip_to_viewport) {
  const _finally = () => {
    if (clip_to_viewport) {
      proj = proj.clipExtent(null);
      map.selectAll('.layer').selectAll('path').attr('d', path);
      reproj_symbol_layer();
    }
  };
  const zoom_params = svg_map.__zoom;
  const _output_name = check_output_name(output_name, 'svg');
  patchSvgForInkscape();
  patchSvgForFonts();
  patchSvgBackground();
  if (clip_to_viewport) {
    proj = proj.clipExtent([
      [0 - zoom_params.x / zoom_params.k, 0 - zoom_params.y / zoom_params.k],
      [(w - zoom_params.x) / zoom_params.k, (h - zoom_params.y) / zoom_params.k],
    ]);
    map.selectAll('.layer').selectAll('path').attr('d', path);
    reproj_symbol_layer();
  }
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
  clickLinkFromDataUrl(url, _output_name).then(() => {
    unpatchSvgForFonts();
    unpatchSvgForForeignObj(dimensions_foreign_obj);
    unpatchSvgForInkscape();
    unpatchSvgBackground();
    _finally();
  }).catch((err) => {
    display_error_during_computation();
    console.log(err);
    _finally();
  });
}

// Maybe PNGs should be rendered on server side in order to avoid limitations that
//   could be encountered in the browser (as 'out of memory' error)
export function export_compo_png(scalefactor = 1, output_name) {
  global._app.waitingOverlay.display();
  const _output_name = check_output_name(output_name, 'png');
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
    global._app.waitingOverlay.hide();
    targetCanvas.remove();
    display_error_during_computation(String(err));
    return;
  }
  if (scalefactor !== 1) {
    try {
      changeResolution(targetCanvas, scalefactor);
    } catch (err) {
      global._app.waitingOverlay.hide();
      targetCanvas.remove();
      display_error_during_computation(`${_tr('app_page.common.error_too_high_resolution')} ${String(err)}`);
      return;
    }
  }
  let imgUrl;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg_xml)}`;
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    try {
      imgUrl = targetCanvas.toDataURL(mime_type);
    } catch (err) {
      global._app.waitingOverlay.hide();
      targetCanvas.remove();
      display_error_during_computation(String(err));
      return;
    }
    clickLinkFromDataUrl(imgUrl, _output_name).then(() => {
      unpatchSvgForFonts();
      unpatchSvgForForeignObj(dimensions_foreign_obj);
      global._app.waitingOverlay.hide();
      targetCanvas.remove();
    }).catch((err) => {
      display_error_during_computation();
      console.log(err);
    });
  };
}

export function export_layer_geo(layer, type, projec, proj4str) {
  const formToSend = new FormData();
  formToSend.append('layer', layer);
  formToSend.append('layer_name', data_manager.current_layers[layer].key_name);
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
          error_message = _tr(JSON.parse(data).Error);
        } else {
          error_message = _tr('app_page.common.error_msg');
        }
        swal({
          title: 'Oops...',
          text: error_message,
          type: 'error',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then(() => null, () => null);
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

export function export_to_code(tooltip_info) {

  const targetSvg = document.getElementById('svg_map').cloneNode(true);
  const g_layer = targetSvg.querySelector(`#${_app.layer_to_id.get(tooltip_info.layer_name)}`);
  const ref_g_layer = svg_map.querySelector(`#${_app.layer_to_id.get(tooltip_info.layer_name)}`);
  const type_symbol = data_manager.current_layers[tooltip_info.layer_name].symbol || 'path';
  g_layer.classList.add('tooltip_target');
  const ref_features = ref_g_layer.querySelectorAll(type_symbol);
  Array.from(g_layer.querySelectorAll(type_symbol))
    .forEach((elem, i) => {
      elem.classList.add('tltp_target');
      elem.dataset.tltp_name_column = encodeURIComponent(
        tooltip_info.field_name);
      elem.dataset.tltp_value = encodeURIComponent(
        ref_features[i].__data__.properties[tooltip_info.field_name]);
      elem.dataset.tltp_name = encodeURIComponent(
        ref_features[i].__data__.properties[tooltip_info.id_field_name]);
    });
  const page_template = `
<!DOCTYPE html>
<meta charset="utf-8">
<body>
<style>
div.tooltip {
  z-index: 1001;
  position: absolute;
  text-align: center;
  padding: 2px:
  font: 12px sans-serif;
  background: lightsteelblue;
  border: 0px;
  border-radius: 8px;
  pointer-events: none;
}
</style>
<div class="tooltip" style="opacity: 0;"><span></span></div>
${(new XMLSerializer()).serializeToString(targetSvg)}
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="http://d3js.org/d3-selection-multi.v1.js"></script>
<script src="http://d3js.org/d3-scale-chromatic.v0.3.min.js"></script>
<script>
(() => {
  const tooltip_div = d3.select('div.tooltip');
  const id_to_layer = new Map(${JSON.stringify(([..._app.id_to_layer]))});
  const current_layers = ${JSON.stringify(global.data_manager.current_layers)};
  const map = d3.select('svg')
    .call(d3.zoom()
      .on('zoom', zoom_without_redraw));
  const svg_map = document.querySelector('svg');
  map.selectAll('.tltp_target')
    .on('mouseover', function () {
      this.dataset.strokevalue = this.style.stroke;
      this.dataset.strokewidth = this.style.strokeWidth;
      this.style.stroke = 'red';
      this.style.strokeWidth = '2px';
      const a = decodeURIComponent(this.dataset.tltp_name_column);
      const b = decodeURIComponent(this.dataset.tltp_value);
      const name = decodeURIComponent(this.dataset.tltp_name);
      tooltip_div
        .transition()
        .duration(200)
        .style('opacity', 0.9);
      tooltip_div
        .select('span')
        .html('<h3>' + name + '</h3><b>' + a + '</b><br>' + b);
      const bbox = tooltip_div.select('span').node().getBoundingClientRect();
      tooltip_div
        .style('width', bbox.width + 10)
        .style('height', bbox.height + 10)
        .style('left', (d3.event.pageX - 5) + 'px')
        .style('top', (d3.event.pageY - bbox.height - 5) + 'px');
      ;
    })
    .on('mouseout', function(d) {
      this.style.stroke = this.dataset.strokevalue;
      this.style.strokeWidth = this.dataset.strokewidth;
      tooltip_div
        .transition()
        .duration(200)
        .style('opacity', 0);
    });
  function zoom_without_redraw() {
    let transform;
    let t_val;
    if (!d3.event || !d3.event.transform || !d3.event.sourceEvent) {
      transform = d3.zoomTransform(svg_map);
      t_val = transform.toString();
      map.selectAll('.layer')
        .transition()
        .duration(50)
        .style('stroke-width', function () {
          const lyr_name = id_to_layer.get(this.id);
          return current_layers[lyr_name].fixed_stroke
            ? this.style.strokeWidth
            : (current_layers[lyr_name]['stroke-width-const'] / transform.k) + 'px';
        })
        .attr('transform', t_val);
      map.selectAll('.scalable-legend')
        .transition()
        .duration(50)
        .attr('transform', t_val);
    } else {
      t_val = d3.event.transform.toString();
      map.selectAll('.layer')
        .transition()
        .duration(50)
        .style('stroke-width', function () {
          const lyr_name = id_to_layer.get(this.id);
          return current_layers[lyr_name].fixed_stroke
            ? this.style.strokeWidth
            : (current_layers[lyr_name]['stroke-width-const'] / d3.event.transform.k) + 'px';
        })
        .attr('transform', t_val);
      map.selectAll('.scalable-legend')
        .transition()
        .duration(50)
        .attr('transform', t_val);
    }
    // if (scaleBar.displayed) {
    //   scaleBar.update();
    // }
  }
})()
</script>
</body>`;
  make_confirm_dialog2('exportWebDialogBox', 'Foo', { widthFitContent: true })
    .then((confirmed) => {
      if (!confirmed) {
        console.log('Not confirmed');
      }
    });
  const box_content = d3.select('.exportWebDialogBox').select('.modal-body').append('div').style('margin', '1x');
  box_content.append('p')
    .html('Include the following html code in an <i>Iframe</i> to include your map');

  box_content.append('div')
    .style('padding', '12px')
    .append('textarea')
    .style('width', '400px')
    .style('height', '400px')
    .html(page_template);
}
