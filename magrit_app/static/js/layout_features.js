"use strict";

class UserArrow {
    constructor(id, origin_pt, destination_pt, parent=undefined, untransformed=false){
        this.parent = parent || legend_node;
        this.svg_elem = d3.select(this.parent);
        this.id = id;
        this.lineWeight = 4;
        this.color = "rgb(0, 0, 0)";

        if(!untransformed){
            let zoom_param = svg_map.__zoom;
            this.pt1 = [(origin_pt[0] - zoom_param.x )/ zoom_param.k, (origin_pt[1] - zoom_param.y) / zoom_param.k],
            this.pt2 = [(destination_pt[0] - zoom_param.x) / zoom_param.k, (destination_pt[1] - zoom_param.y) / zoom_param.k];
        } else {
            this.pt1 = origin_pt;
            this.pt2 = destination_pt;
        }
        let self = this;
        this.drag_behavior = d3.drag()
             .subject(function() {
                    let t = d3.select(this.querySelector("line"));
                    return { x: +t.attr("x2") - +t.attr("x1"),
                             y: +t.attr("y2") - +t.attr("y1"),
                             x1: t.attr("x1"), x2: t.attr("x2"),
                             y1: t.attr("y1"), y2: t.attr("y2"),
                             map_locked: map_div.select("#hand_button").classed("locked") ? true : false
                        };
              })
            .on("start", () => {
                d3.event.sourceEvent.stopPropagation();
                handle_click_hand("lock");
              })
            .on("end", () => {
                if(d3.event.subject && !d3.event.subject.map_locked)
                    handle_click_hand("unlock");  // zoom.on("zoom", zoom_without_redraw);
              })
            .on("drag", function(){
                d3.event.sourceEvent.preventDefault();
                let _t = this.querySelector("line"),
                    subject = d3.event.subject,
                    tx = (+d3.event.x - +subject.x) / svg_map.__zoom.k,
                    ty = (+d3.event.y - +subject.y) / svg_map.__zoom.k;
                self.pt1 = [+subject.x1 + tx, +subject.y1 + ty];
                self.pt2 = [+subject.x2 + tx, +subject.y2 + ty];
                _t.x1.baseVal.value = self.pt1[0];
                _t.x2.baseVal.value = self.pt2[0];
                _t.y1.baseVal.value = self.pt1[1];
                _t.y2.baseVal.value = self.pt2[1];
              });

        let defs = parent.querySelector("defs"),
            markers = defs ? defs.querySelector("marker") : null;

        if(!markers){
            this.add_defs_marker();
        }
        this.draw()
    }

    add_defs_marker(){
        defs.append("marker")
            .attrs({"id":"arrow_head", "viewBox":"0 -5 10 10",
                  "refX":5, "refY":0, "orient":"auto",
                  "markerWidth":4, "markerHeight":4})
            .style("stroke-width", 1)
        	.append("path")
        	.attr("d", "M0,-5L10,0L0,5")
        	.attr("class","arrowHead");
        if(this.parent.childNodes[0].tagName != "defs"){
            this.parent.insertBefore(defs.node(), this.parent.childNodes[0]);
        }
    }

    draw(){
        let context_menu = new ContextMenu(),
            getItems = () =>  [
                {"name": i18next.t("app_page.common.edit_style"), "action": () => { this.editStyle(); }},
                {"name": i18next.t("app_page.common.up_element"), "action": () => { this.up_element(); }},
                {"name": i18next.t("app_page.common.down_element"), "action": () => { this.down_element(); }},
                {"name": i18next.t("app_page.common.delete"), "action": () => { this.arrow.remove(); }}
            ];

        this.arrow = this.svg_elem.append('g')
                .style("cursor", "all-scroll")
                .attrs({"class": "arrow legend_features legend scalable-legend", "id": this.id, transform: svg_map.__zoom.toString()});

        this.arrow.insert("line")
        		.attrs({"class":"legend_features",
        			  "marker-end":"url(#arrow_head)",
        			  "x1": this.pt1[0], "y1": this.pt1[1],
        			  "x2":this.pt2[0], "y2": this.pt2[1]})
                .styles({"stroke-width": this.lineWeight, stroke: "rgb(0, 0, 0)"});

        this.arrow.call(this.drag_behavior);

        this.arrow.on("contextmenu", () => {
            context_menu.showMenu(d3.event,
                                  document.querySelector("body"),
                                  getItems());
            });
        this.arrow.on("dblclick", () => {
            d3.event.preventDefault();
            d3.event.stopPropagation();
            this.handle_ctrl_pt()
        });
    }

    up_element(){
        up_legend(this.arrow.node());
    }

    down_element(){
        down_legend(this.arrow.node());
    }

    handle_ctrl_pt(){
      let self = this,
          line = self.arrow.node().querySelector("line"),
          zoom_params = svg_map.__zoom,
          map_locked = map_div.select("#hand_button").classed("locked") ? true : false;

      // New behavior if the user click on the lock to move on the map :
      let cleanup_edit_state = () => {
          self.pt1 = [line.x1.baseVal.value, line.y1.baseVal.value];
          self.pt2 = [line.x2.baseVal.value, line.y2.baseVal.value];
          map.select('#arrow_start_pt').remove();
          map.select('#arrow_end_pt').remove();

          // Reactive the ability to move the arrow :
          self.arrow.call(self.drag_behavior);
          // Restore the ability to edit the control points on dblclick on the arrow :
          self.arrow.on("dblclick", () => {
              d3.event.preventDefault();
              d3.event.stopPropagation();
              self.handle_ctrl_pt()
          });
          // Restore the previous behiavor for the 'lock' button :
          document.getElementById("hand_button").onclick = handle_click_hand;
      }

      document.getElementById("hand_button").onclick = function(){
          cleanup_edit_state();
          handle_click_hand();
      };

      // Desactive the ability to drag the arrow :
      self.arrow.on('.drag', null);
      // Desactive the ability to zoom/move on the map ;
      handle_click_hand('lock');

      // Append two red squares for the start point and the end point of the arrow :
      map.append("rect")
         .attrs({x: self.pt1[0] * zoom_params.k + zoom_params.x - 3, y: self.pt1[1]  * zoom_params.k + zoom_params.y - 3, height: 6, width:6, id: 'arrow_start_pt'})
         .styles({fill: 'red', cursor: 'grab'})
         .call(d3.drag().on("drag", function(){
             let t = d3.select(this),
                 nx = d3.event.x,
                 ny = d3.event.y;
             t.attrs({x: nx - 3, y: ny - 3});
             line.x1.baseVal.value = (nx - zoom_params.x) / zoom_params.k;
             line.y1.baseVal.value = (ny - zoom_params.y) / zoom_params.k;
         }));
      map.append("rect")
         .attrs({x: self.pt2[0] * zoom_params.k + zoom_params.x - 3, y: self.pt2[1] * zoom_params.k + zoom_params.y - 3, height: 6, width:6, id: 'arrow_end_pt'})
         .styles({fill: 'red', cursor: 'grab'})
         .call(d3.drag().on("drag", function(){
             let t = d3.select(this),
                 nx = d3.event.x,
                 ny = d3.event.y;
             t.attrs({x: nx - 3, y: ny - 3});
             line.x2.baseVal.value = (nx - zoom_params.x) / zoom_params.k;
             line.y2.baseVal.value = (ny - zoom_params.y) / zoom_params.k;
          }));

      // Exit the "edit" state by double clicking again on the arrow :
      self.arrow.on("dblclick", function(){
          d3.event.stopPropagation();
          d3.event.preventDefault();
          cleanup_edit_state();
          if(!map_locked){
              handle_click_hand('unlock');
          }
      });
    }

    calcAngle(){
        let dx = this.pt2[0] - this.pt1[0],
            dy = this.pt2[1] - this.pt1[1];
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    calcDestFromOAD(origin, angle, distance){
        let theta = angle / (180 / Math.PI),
            dx = distance * Math.cos(theta),
            dy = distance * Math.sin(theta);
        return [origin[0] + dx, origin[1] + dy]
    }

    editStyle(){
        let current_options = {pt1: this.pt1.slice(),
                               pt2: this.pt2.slice()};
        let self = this,
            line = self.arrow.node().querySelector("line"),
            angle = (-this.calcAngle()).toFixed(0),
            map_locked = map_div.select("#hand_button").classed("locked") ? true : false;

        if(!map_locked) handle_click_hand('lock');

        let existing_box = document.querySelector(".styleBoxArrow");
        if(existing_box) existing_box.remove();

        make_confirm_dialog2("styleBoxArrow", i18next.t("app_page.arrow_edit_box.title"), {widthFitContent: true})
            .then(function(confirmed){
                if(confirmed) {
                    // Store shorcut of useful values :
                    self.lineWeight = line.style.strokeWidth;
                    self.color = line.style.stroke;
                    self.pt1 = [line.x1.baseVal.value, line.y1.baseVal.value];
                    self.pt2 = [line.x2.baseVal.value, line.y2.baseVal.value];
                } else {
                    //Rollback on initials parameters :
                    line.x1.baseVal.value = current_options.pt1[0];
                    line.y1.baseVal.value = current_options.pt1[1];
                    line.x2.baseVal.value = current_options.pt2[0];
                    line.y2.baseVal.value = current_options.pt2[1];
                    self.pt1 = current_options.pt1.slice();
                    self.pt2 = current_options.pt2.slice();
                    line.style.strokeWidth = self.lineWeight;
                    line.style.stroke = self.color;
                }
                map.select('#arrow_start_pt').remove();
                map.select('#arrow_end_pt').remove();
                if(!map_locked) handle_click_hand('unlock');
            });

        let box_content = d3.select(".styleBoxArrow").select(".modal-body").style("width", "295px").insert("div").attr("id", "styleBoxArrow");
        let s1 = box_content.append("p").attr('class', 'line_elem');
        s1.append("span").html(i18next.t("app_page.arrow_edit_box.arrowWeight"));
        s1.insert("span").styles({'float': 'right', 'width': '13px'}).html("px");
        s1.insert("input")
            .attrs({id: "arrow_weight_text", class: "without_spinner", value: self.lineWeight, min: 0, max: 34, step: 0.1,})
            .styles({width: "30px", "margin-left": "10px", 'float': 'right'})
            .on("input", function(){
                let elem = document.getElementById("arrow_lineWeight");
                elem.value = this.value;
                elem.dispatchEvent(new Event('change'));
            });

        s1.append("input")
            .attrs({type: "range", id: "arrow_lineWeight", min: 0, max: 34, step: 0.1, value: self.lineWeight})
            .styles({width: "80px", "vertical-align": "middle", 'float': 'right'})
            .on("change", function(){
                line.style.strokeWidth = this.value;
                document.getElementById("arrow_weight_text").value = +this.value;
            });

        let s2 = box_content.append("p").attr('class', 'line_elem');
        s2.append("span").html(i18next.t("app_page.arrow_edit_box.arrowAngle"))
        s2.insert("span").styles({'float': 'right', 'width': '13px'}).html("&nbsp;°");
        s2.insert("input")
            .attrs({id: "arrow_angle_text", class: "without_spinner", value: angle, min: 0, max: 1, step: 1})
            .styles({width: "30px", "margin-left": "10px", 'float': 'right'})
            .on("input", function(){
                let elem = document.getElementById("arrow_angle");
                elem.value = this.value;
                elem.dispatchEvent(new Event('change'));
            });
        s2.insert("input")
            .attrs({id: "arrow_angle", type: "range", value: angle, min: 0, max: 360, step: 1})
            .styles({width: "80px", "vertical-align": "middle", 'float': 'right'})
            .on("change", function(){
                let distance = Math.sqrt((self.pt1[0] - self.pt2[0]) * (self.pt1[0] - self.pt2[0]) + (self.pt1[1] - self.pt2[1]) * (self.pt1[1] - self.pt2[1]));
                let angle = -(+this.value);
                let [nx, ny] = self.calcDestFromOAD(self.pt1, angle, distance);
                line.x2.baseVal.value = nx;
                line.y2.baseVal.value = ny;
                document.getElementById("arrow_angle_text").value = +this.value;
            });
    }
}

class Textbox {
    constructor(parent, new_id_txt_annot, position=[10, 30]){
        this.x = position[0];
        this.y = position[1];
        this.fontsize = 14;

        // function end_edit_action(){
        //     inner_ft.attr("contentEditable", "false");
        //     inner_ft.style("background-color", "transparent");
        //     inner_ft.style("border", "");
        //     // Recompute the size of the p inside the foreignObj
        //     let inner_bbox = inner_p.getBoundingClientRect();
        //     foreign_obj.setAttributeNS(null, "width", [inner_bbox.width + 2, "px"].join('')); // +2px are for the border
        //     foreign_obj.setAttributeNS(null, "height", [inner_bbox.height + 2, "px"].join(''));
        //     d3.select("body").classed("noselect", false);
        //     state = null;
        // };

        var current_timeout;
        let context_menu = new ContextMenu(),
            getItems = () =>  [
                {"name": i18next.t("app_page.common.edit_style"), "action": () => { this.editStyle(); }},
                {"name": i18next.t("app_page.common.up_element"), "action": () => { this.up_element(); }},
                {"name": i18next.t("app_page.common.down_element"), "action": () => { this.down_element(); }},
                {"name": i18next.t("app_page.common.delete"), "action": () => { this.text_annot.remove(); }}
            ];

        let drag_txt_annot = d3.drag()
             .subject(function() {
                    var t = d3.select(this.parentElement);
                    return {
                        x: t.attr("x"), y: t.attr("y"),
                        map_locked: map_div.select("#hand_button").classed("locked") ? true : false
                    };
                })
            .on("start", () => {
                d3.event.sourceEvent.stopPropagation();
                handle_click_hand("lock");
              })
            .on("end", () => {
                if(d3.event.subject && !d3.event.subject.map_locked)
                    handle_click_hand("unlock");
              })
            .on("drag", function(){
                d3.event.sourceEvent.preventDefault();
                d3.select(this.parentElement).attrs({x: +d3.event.x, y: +d3.event.y});
                // let x = +d3.event.x,
                //     y = +d3.event.y,
                //     t = d3.select(this.parentElement);
                // t.attrs({x: x, y: y});
            });

        let foreign_obj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreign_obj.setAttributeNS(null, "x", this.x);
        foreign_obj.setAttributeNS(null, "y", this.y);
        foreign_obj.setAttributeNS(null, "overflow", "visible");
        foreign_obj.setAttributeNS(null, "width", "100%");
        foreign_obj.setAttributeNS(null, "height", "100%");
        foreign_obj.setAttributeNS(null, "class", "legend txt_annot");
        foreign_obj.id = new_id_txt_annot;
        foreign_obj.style.cursor = "pointer";

        let inner_p = document.createElement("p");
        inner_p.setAttribute("id", "in_" + new_id_txt_annot);
        inner_p.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        inner_p.style = "display:table-cell;padding:10px;color:#000;"
            + "opacity:1;font-family:'Verdana,Geneva,sans-serif';font-size:14px;white-space: pre;"
            + "word-wrap: normal; overflow: visible; overflow-y: visible; overflow-x: visible;"
        inner_p.innerHTML = i18next.t("app_page.text_box_edit_box.constructor_default");
        foreign_obj.appendChild(inner_p);
        parent.appendChild(foreign_obj);

        // foreignObj size was set to 100% for fully rendering its content,
        // now we can reduce its size to the inner content
        // (it will avoid it to overlay some other svg elements)
        {
            let inner_bbox = inner_p.getBoundingClientRect();
            foreign_obj.setAttributeNS(null, "width", [inner_bbox.width + 2, "px"].join('')); // +2px are for the border
            foreign_obj.setAttributeNS(null, "height", [inner_bbox.height + 2, "px"].join(''));
        }

        var frgn_obj = map.select("#" + new_id_txt_annot),
            inner_ft = frgn_obj.select('p');
        inner_ft.call(drag_txt_annot);

        inner_ft.on("contextmenu", () => {
            context_menu.showMenu(d3.event,
                                  document.querySelector("body"),
                                  getItems());
            });

        inner_ft.on('dblclick', () => {
            d3.event.preventDefault();
            d3.event.stopPropagation();
            this.editStyle();
        });

        inner_ft.on("mouseover", () => {
            inner_ft.style("background-color", "#0080001a");
            // toogle the size of the container to 100% while we are using it :
            foreign_obj.setAttributeNS(null, "width", "100%");
            foreign_obj.setAttributeNS(null, "height", "100%");
        });

        inner_ft.on("mouseout", () => {
            inner_ft.style("background-color", null);
            // Recompute the size of the p inside the foreignObj
            let inner_bbox = inner_p.getBoundingClientRect();
            foreign_obj.setAttributeNS(null, "width", [inner_bbox.width + 2, "px"].join('')); // +2px are for the border
            foreign_obj.setAttributeNS(null, "height", [inner_bbox.height + 2, "px"].join(''));
        });

        this.text_annot = frgn_obj;
        this.font_family = 'Verdana,Geneva,sans-serif';
        this.id = new_id_txt_annot;
        return this;
    }
    editStyle(){
            let map_xy0 = get_map_xy0();
            let self = this,
                inner_p = this.text_annot.select('p');

            let existing_box = document.querySelector(".styleTextAnnotation");
            if(existing_box) existing_box.remove();

            let current_options = {
                size: inner_p.style("font-size"),
                color: inner_p.style("color"),
                content: unescape(inner_p.html()),
                transform_rotate: this.text_annot.attr('transform'),
                x: this.text_annot.attr('x'), y: this.text_annot.attr('y'),
                font: "",
                font_weight: inner_p.style('font-weight'),
                font_style: inner_p.style('font-style'),
                text_decoration: inner_p.style('text-decoration')
            };
            current_options.font_weight = (current_options.font_weight == "400" || current_options.font_weight == "") ? '' : 'bold';
            make_confirm_dialog2("styleTextAnnotation", i18next.t("app_page.text_box_edit_box.title"), {widthFitContent: true})
                .then(function(confirmed){
                    if(!confirmed){
                        self.text_annot.select('p')
                            .text(current_options.content)
                            .styles({'color': current_options.color, 'font-size': current_options.size});
                        self.fontsize = current_options.size;
                        // self.rotate = current_options.rotate;
                        self.text_annot.attr('transform', current_options.transform_rotate);
                    }
                });
            let box_content = d3.select(".styleTextAnnotation").select(".modal-body").style("width", "295px").insert("div").attr("id", "styleTextAnnotation");

            let current_rotate = typeof current_options.transform_rotate == "string" ? current_options.transform_rotate.match(/[-.0-9]+/g) : 0;
            if(current_rotate && current_rotate.length == 3){
                current_rotate = +current_rotate[0];
            } else {
                current_rotate = 0;
            }

            let bbox = inner_p.node().getBoundingClientRect(),
                nx = bbox.left - map_xy0.x,
                ny = bbox.top - map_xy0.y,
                x_center = nx + bbox.width / 2,
                y_center = ny + bbox.height / 2;

            let option_rotation = box_content.append('p').attr('class', 'line_elem');
            option_rotation.append("span").html(i18next.t("app_page.text_box_edit_box.rotation"));
            option_rotation.append('span').style('float', 'right').html(' °');
            option_rotation.append("input")
                .attrs({type: "number", min: 0, max: 360, step: "any", value: current_rotate,
                        class: "without_spinner", id: "textbox_txt_rotate"})
                .styles({'width': '40px', 'float': 'right'})
                .on("change", function(){
                  let rotate_value = +this.value;
                  self.text_annot
                      .attrs({x: nx, y: ny, 'transform': "rotate(" + [rotate_value, x_center, y_center] + ")"});
                  document.getElementById("textbox_range_rotate").value = rotate_value;
                });

            option_rotation.append("input")
                .attrs({type: "range", min: 0, max: 360, step: 0.1, id: "textbox_range_rotate", value: current_rotate})
                .styles({"vertical-align": "middle", "width": "100px", "float": "right", "margin": "auto 10px"})
                .on("change", function(){
                  let rotate_value = +this.value;
                  self.text_annot
                      .attrs({x: nx, y: ny, 'transform': "rotate(" + [rotate_value, x_center, y_center] + ")"});
                  document.getElementById("textbox_txt_rotate").value = rotate_value;
                });

            let options_font = box_content.append('p'),
                font_select = options_font.insert("select").on("change", function(){ inner_p.style("font-family", this.value); });

            available_fonts.forEach(function(font){
                font_select.append("option").text(font[0]).attr("value", font[1])
            });
            font_select.node().selectedIndex = available_fonts.map(d => d[1] == this.font_family ? "1" : "0").indexOf("1");

            options_font.append("input")
                .attrs({type: "number", id: "font_size", min: 0, max: 34, step: 0.1, value: this.fontsize})
                .style('width', '60px')
                .on("change", function(){
                    self.fontsize = +this.value;
                    inner_p.style("font-size", self.fontsize + "px");
                });

            options_font.append("input")
                .attrs({type: "color", id: "font_color", value: current_options.color})
                .style('width', '60px')
                .on("change", function(){
                    inner_p.style("color", this.value);
                });

            let options_format = box_content.append('p'),
                btn_bold = options_format.insert('span').attr('class', current_options.font_weight == 'bold' ? 'active button_disc' : 'button_disc').html('<img title="Bold" src="data:image/gif;base64,R0lGODlhFgAWAID/AMDAwAAAACH5BAEAAAAALAAAAAAWABYAQAInhI+pa+H9mJy0LhdgtrxzDG5WGFVk6aXqyk6Y9kXvKKNuLbb6zgMFADs=">'),
                btn_italic = options_format.insert('span').attr('class', current_options.font_style == 'italic' ? 'active button_disc' : 'button_disc').html('<img title="Italic" src="data:image/gif;base64,R0lGODlhFgAWAKEDAAAAAF9vj5WIbf///yH5BAEAAAMALAAAAAAWABYAAAIjnI+py+0Po5x0gXvruEKHrF2BB1YiCWgbMFIYpsbyTNd2UwAAOw==">'),
                btn_underline = options_format.insert('span').attr('class', current_options.text_decoration == 'underline' ? 'active button_disc' : 'button_disc').html('<img title="Underline" src="data:image/gif;base64,R0lGODlhFgAWAKECAAAAAF9vj////////yH5BAEAAAIALAAAAAAWABYAAAIrlI+py+0Po5zUgAsEzvEeL4Ea15EiJJ5PSqJmuwKBEKgxVuXWtun+DwxCCgA7">');

            let content_modif_zone = box_content.append("p");
            content_modif_zone.append("span")
                    .html(i18next.t("app_page.text_box_edit_box.content"));
            content_modif_zone.append("span")
                    .html("<br>");
            let textarea = content_modif_zone.append("textarea")
                    .attr("id", "annotation_content")
                    .style("margin", "5px 0px 0px")
                    .on("keyup", function(){
                        inner_p.html(this.value)
                    });
            textarea = textarea.node();
            document.getElementById("annotation_content").value = current_options.content;
            btn_bold.on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    inner_p.style('font-weight', '');
                } else {
                    this.classList.add('active');
                    inner_p.style('font-weight', 'bold');
                }
            });

            btn_italic.on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    inner_p.style('font-style', '');
                } else {
                    this.classList.add('active');
                    inner_p.style('font-style', 'italic');
                }
            });
            btn_underline.on('click', function(){
                if(this.classList.contains('active')){
                    this.classList.remove('active');
                    inner_p.style('text-decoration', '');
                } else {
                    this.classList.add('active');
                    inner_p.style('text-decoration', 'underline');
                }
            });
    }

    up_element(){
        up_legend(this.text_annot.node())
    }

    down_element(){
        down_legend(this.text_annot.node())
    }
}

/**
* Handler for the scale bar (only designed for one scale bar)
*
*/
var scaleBar = {
    create: function(){
        if(!proj.invert){
            swal({title: "",
                  text: i18next.t("app_page.common.error_interrupted_projection_scalebar"),
                  type: "error",
                  allowOutsideClick: false,
                  allowEscapeKey: false
                }).then( () => { null; },
                          () => { null; });
            return;
        }
        let scale_gp = svg_legend.append("g").attr("id", "scale_bar").attr("class", "legend scale"),
            x_pos = 40,
            y_pos = h - 100,
            bar_size = 50,
            self = this;

        this.x = x_pos;
        this.y = y_pos;
        this.bar_size = bar_size;
        this.unit = "km";
        this.precision = 0;
        this.start_end_bar = false;
        this.fixed_size = false;
        this.getDist();

        let getItems = () => [
            {"name": i18next.t("app_page.common.edit_style"), "action": () => { this.editStyle()}},
            {"name": i18next.t("app_page.common.delete"), "action": () => { this.remove(); }}
        ];

        let scale_context_menu = new ContextMenu();
        this.under_rect = scale_gp.insert("rect")
            .attrs({x: x_pos - 2.5, y: y_pos - 20, height: 30, width: this.bar_size + 5})
            .styles({"fill": "green", "fill-opacity": 0});
        scale_gp.insert("rect").attr("id", "rect_scale")
            .attrs({x: x_pos, y: y_pos, height: 2, width: this.bar_size})
            .style("fill", "black");
        scale_gp.insert("text").attr("id", "text_limit_sup_scale")
            .attrs({x: x_pos + bar_size, y: y_pos - 5})
            .styles({"font": "11px 'Enriqueta', arial, serif",
                     "text-anchor": "middle"})
            .text(this.dist_txt + " km");

        scale_gp.call(drag_legend_func(scale_gp));
        scale_gp.on("mouseover", function(){
                  this.style.cursor = "pointer";
                  self.under_rect.style("fill-opacity", 0.1)
                })
                .on("mouseout", function(){
                  this.style.cursor = "pointer";
                  self.under_rect.style("fill-opacity", 0)
                })
                .on("contextmenu dblclick", (d,i) => {
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                    return scale_context_menu
                       .showMenu(d3.event, document.querySelector("body"), getItems());
                });
        this.Scale = scale_gp;
        this.displayed = true;
        if(this.dist > 100){
            this.resize(Math.round(this.dist / 100) * 100);
        } else if (this.dist > 10){
            this.resize(Math.round(this.dist / 10) * 10);
        } else {
            this.resize(this.dist);
        }
    },
    getDist: function(){
        let x_pos = w / 2,
            y_pos = h / 2,
            transform = d3.zoomTransform(svg_map),
            z_trans = [transform.x, transform.y],
            z_scale = transform.k;

        if(isNaN(this.bar_size)){
            console.log("scaleBar.bar_size : NaN");
            this.bar_size = 50;
        }

        let pt1 = proj.invert([(x_pos - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]),
            pt2 = proj.invert([(x_pos + this.bar_size - z_trans[0]) / z_scale, (y_pos - z_trans[1]) / z_scale]);

        this.dist = coslaw_dist([pt1[1], pt1[0]], [pt2[1], pt2[0]]);
        let mult = this.unit == "km" ? 1
                    : this.unit == "m" ? 1000
                    : this.unit == "mi" ? 0.621371 : 1;
        this.dist_txt = (this.dist * mult).toFixed(this.precision);

    },
    resize: function(desired_dist){
        desired_dist = desired_dist || this.fixed_size;
        let ratio = +this.dist / desired_dist;
        let new_size = this.bar_size / ratio;

        this.Scale.select("#rect_scale")
                  .attr("width", new_size);
        this.Scale.select("#text_limit_sup_scale")
                  .attr("x", this.x + new_size / 2);
        this.bar_size = new_size;
        this.fixed_size = desired_dist;
        this.under_rect.attr("width", new_size + 5);
        this.changeText();
        this.handle_start_end_bar();

    },
    changeText: function(){
        this.getDist();
        this.Scale.select("#text_limit_sup_scale").text(this.dist_txt + " " + this.unit);
    },
    update: function(){
        this.changeText();
        if(this.fixed_size)
            this.resize();
    },
    remove: function(){
        this.Scale.remove();
        this.Scale = null;
        this.displayed = false;
    },
    handle_start_end_bar: function(){
        this.Scale.selectAll(".se_bar").remove();
        if(this.start_end_bar){
            this.Scale.insert("rect")
                .attrs({class: 'start_bar se_bar', x: this.x, y: this.y - 4.5, width: '1.5px', height: '4.5px'});

            this.Scale.insert("rect")
                .attrs({class: 'end_bar se_bar', x: this.x + this.bar_size - 1.5, y: this.y - 4.5, width: '1.5px', height: '4.5px'});
        }
    },
    editStyle: function(){
        var new_val,
            self = this,
            redraw_now = () => {
              if(new_val)
                  self.resize(new_val);
              else {
                  self.fixed_size = false;
                  self.changeText();
              }
            };
        make_confirm_dialog2("scaleBarEditBox", i18next.t("app_page.scale_bar_edit_box.title"), {widthFitContent: true})
            .then(function(confirmed){
                if(confirmed){ redraw_now(); }
            });
        var box_body = d3.select(".scaleBarEditBox").select(".modal-body").style("width", "295px");
        // box_body.node().parentElement.style.width = "auto";
        box_body.append("h3")
            .html(i18next.t("app_page.scale_bar_edit_box.title"));
        let a = box_body.append("p").attr('class', 'line_elem');
        a.append('span').html(i18next.t("app_page.scale_bar_edit_box.fixed_size"));
        a.append("input")
            .style('float', 'right')
            .attrs({id: 'scale_fixed_field', type: 'number', disabled: self.fixed_size ? null : true, value: +this.dist_txt})
            .on("change", function(){
              new_val = +this.value;
              redraw_now();
            });
        a.append("input")
            .style('float', 'right')
            .attrs({type: 'checkbox', "checked": self.fixed_size ? true : null})
            .on("change", function(){
                if(box_body.select("#scale_fixed_field").attr("disabled")){
                    box_body.select("#scale_fixed_field").attr("disabled", null);
                    new_val = +box_body.select("#scale_fixed_field").attr("value");
                } else {
                    box_body.select("#scale_fixed_field").attr("disabled", true);
                    new_val = false;
                }
                redraw_now();
              });

        let b = box_body.append("p").attr('class', 'line_elem');
        b.insert("span")
            .html(i18next.t("app_page.scale_bar_edit_box.precision"));
        b.insert("input")
            .style('float', 'right')
            .attrs({id: 'scale_precision', type: "number", min: 0, max: 6, step: 1, value: +this.precision})
            .style("width", "60px")
            .on("change", function(){
              self.precision = +this.value;
              redraw_now();
            });

        let c = box_body.append("p").attr('class', 'line_elem');
        c.insert("span")
            .html(i18next.t("app_page.scale_bar_edit_box.unit"));
        let unit_select = c.insert("select")
            .style('float', 'right')
            .attr('id', "scale_unit")
            .on("change", function(){
              self.unit = this.value;
              redraw_now();
            });
        unit_select.append("option").text("km").attr("value", "km");
        unit_select.append("option").text("m").attr("value", "m");
        unit_select.append("option").text("mi").attr("value", "mi");
        unit_select.node().value = self.unit;

        let e = box_body.append("p").attr('class', 'line_elem');
        e.append("span")
                .html(i18next.t("app_page.scale_bar_edit_box.start_end_bar"));
        e.append("input")
            .style('float', 'right')
            .attrs({id: 'checkbox_start_end_bar', type: 'checkbox'})
            .on("change", function(a){
                self.start_end_bar = self.start_end_bar == true ? false : true;
                self.handle_start_end_bar()
            });
        document.getElementById("checkbox_start_end_bar").checked = self.start_end_bar;

    },
    displayed: false
};

var northArrow = {
    display: function(){
        let x_pos = w - 100,
            y_pos = h - 100,
            self = this;

        let arrow_gp = svg_legend.append("g")
                        .attr("id", "north_arrow")
                        .attr("class", "legend")
                        .attr("scale", 1)
                        .attr("rotate", null)
                        .style("cursor", "all-scroll");

        this.svg_node = arrow_gp;
        this.displayed = true;

        this.arrow_img = arrow_gp.insert("image")
            .attr("x", x_pos)
            .attr("y", y_pos)
            .attr("height","30px")
            .attr("width", "30px")
            .attr("xlink:href", "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxOC4xLjEsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FscXVlXzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIzMTEgMjc4LjYgMzYuOSA1MC41IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDMxMSAyNzguNiAzNi45IDUwLjUiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHBvbHlnb24gZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50cz0iMzEyLjMsMzI3LjkgMzI4LjksMzE4LjUgMzI4LjksMjk2LjQgIi8+DQo8cG9seWdvbiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRzPSIzMjkuOSwyOTYuNCAzMjkuOSwzMTguNSAzNDYuNywzMjcuOCAiLz4NCjxnPg0KCTxwYXRoIGQ9Ik0zMjIuOCwyNzguNmgyLjlsNi43LDEwLjN2LTEwLjNoM3YxNS43aC0yLjlsLTYuNy0xMC4zdjEwLjNoLTNWMjc4LjZ6Ii8+DQo8L2c+DQo8L3N2Zz4NCg==");

        this.drag_behavior = d3.drag()
             .subject(function() {
                    let t = d3.select(this.querySelector("image"));
                    return {
                        x: +t.attr("x"),
                        y: +t.attr("y"),
                        map_locked: map_div.select("#hand_button").classed("locked") ? true : false
                    };
              })
            .on("start", () => {
                d3.event.sourceEvent.stopPropagation();
                handle_click_hand("lock"); // zoom.on("zoom", null);
              })
            .on("end", () => {
                if(d3.event.subject && !d3.event.subject.map_locked)
                    handle_click_hand("unlock");  // zoom.on("zoom", zoom_without_redraw);
              })
            .on("drag", function(){
                d3.event.sourceEvent.preventDefault();
                let t1 = this.querySelector("image"),
                    t2 = this.querySelector("rect"),
                    tx = +d3.event.x,
                    ty = +d3.event.y,
                    dim = t2.width.baseVal.value / 2;
                if(tx < 0 - dim || tx > w + dim || ty < 0 - dim || ty > h + dim)
                  return;
                t1.x.baseVal.value = tx;
                t1.y.baseVal.value = ty;
                t2.x.baseVal.value = tx;
                t2.y.baseVal.value = ty;
                self.x_center = tx + dim;
                self.y_center = ty + dim;
              });

        let getItems = () => [
            {"name": i18next.t("app_page.common.options"), "action": () => { this.editStyle()}},
            {"name": i18next.t("app_page.common.up_element"), "action": () => { this.up_element(); }},
            {"name": i18next.t("app_page.common.down_element"), "action": () => { this.down_element(); }},
            {"name": i18next.t("app_page.common.delete"), "action": () => { this.remove(); }}
        ];

        let arrow_context_menu = new ContextMenu();

        let bbox = document.getElementById("north_arrow").getBoundingClientRect(),
            xy0_map = get_map_xy0();

        this.under_rect = arrow_gp.append("g")
            .insert("rect")
                .style("fill", "green")
                .style("fill-opacity", 0)
                .attr("x", bbox.left - xy0_map.x)
                .attr("y", bbox.top - xy0_map.y)
                .attr("height", bbox.height)
                .attr("width", bbox.width);

        this.x_center = bbox.left - xy0_map.x + bbox.width / 2;
        this.y_center = bbox.top - xy0_map.y + bbox.height / 2

        arrow_gp.call(this.drag_behavior);

        arrow_gp
            .on("mouseover", function(){
                self.under_rect.style("fill-opacity", 0.1);
                })
            .on("mouseout", function(){
                self.under_rect.style("fill-opacity", 0);
                })
            .on("contextmenu dblclick", (d,i) => {
                d3.event.preventDefault();
                return arrow_context_menu
                   .showMenu(d3.event, document.querySelector("body"), getItems());
            });
    },
    up_element: function(){
            up_legend(this.svg_node.node());
    },
    down_element: function(){
            down_legend(this.svg_node.node());
    },
    remove: function(){
        this.svg_node.remove();
        this.displayed = false;
    },
    editStyle: function(){
        var self = this,
            old_dim = +self.under_rect.attr("width"),
            old_rotate = !isNaN(+self.svg_node.attr("rotate")) ? +self.svg_node.attr("rotate") : 0,
            x_pos = +self.x_center - old_dim / 2,
            y_pos = +self.y_center - old_dim /2;

        make_confirm_dialog2("arrowEditBox", i18next.t("app_page.north_arrow_edit_box.title"),  {widthFitContent: true})
            .then(function(confirmed){
                if(confirmed){
                    null;
                }
            });

        var box_body = d3.select(".arrowEditBox").select(".modal-body").style("width", "295px");
        box_body.append("h3")
                .html(i18next.t("app_page.north_arrow_edit_box.title"));
        let a = box_body.append('p').attr('class', 'line_elem');
        a.append('span').html(i18next.t("app_page.north_arrow_edit_box.size"));
        a.append("span")
            .style('float', 'right')
            .html(" px");
        a.append("input")
            .attrs({type: "number", min: 0, max: 200, step: 1, value: old_dim,
                    class: "without_spinner", id: "txt_size_n_arrow"})
            .styles({float: 'right', width: '40px'})
            .on("change", function(){
                let elem = document.getElementById("range_size_n_arrow");
                elem.value = +this.value;
                elem.dispatchEvent(new Event("change"));
            });
        a.append("input")
            .attrs({type: "range", min: 1, max: 200, step: 1,
                    value: old_dim, id: "range_size_n_arrow"})
            .styles({"vertical-align": "middle", "width": "140px", 'float': 'right'})
            .on("change", function(){
                let new_size = +this.value;
                self.arrow_img.attr("width", new_size);
                self.arrow_img.attr("height", new_size);
                self.under_rect.attr("width", new_size);
                self.under_rect.attr("height", new_size);
                self.x_center = x_pos + new_size / 2;
                self.y_center = y_pos + new_size / 2;
                document.getElementById("txt_size_n_arrow").value = new_size;
            });

        let b = box_body.append("p").attr('class', 'line_elem');
        b.append('span').html(i18next.t("app_page.north_arrow_edit_box.rotation"));
        b.append("span")
            .style('float', 'right')
            .html(" °");
        b.append("input")
            .attrs({type: "number", min: 0, max: 360, step: "any", value: old_rotate,
                    class: "without_spinner", id: "txt_rotate_n_arrow"})
            .styles({float: 'right', width: '40px'})
            .on("change", function(){
                let rotate_value = +this.value;
                self.svg_node.attr("rotate", rotate_value);
                self.svg_node.attr("transform", "rotate(" + [rotate_value, self.x_center, self.y_center] + ")");
                document.getElementById("range_rotate_n_arrow").value = rotate_value;
            });
        b.append("input")
            .attrs({type: "range", min: 0, max: 360, step: 0.1, id: "range_rotate_n_arrow", value: old_rotate})
            .styles({"vertical-align": "middle", "width": "140px", 'float': 'right'})
            .on("change", function(){
                let rotate_value = +this.value;
                self.svg_node.attr("rotate", rotate_value);
                self.svg_node.attr("transform", "rotate(" + [rotate_value, self.x_center, self.y_center] + ")");
                document.getElementById("txt_rotate_n_arrow").value = rotate_value;
            });

    },
    displayed: false
}


class UserEllipse {
    constructor(id, origin_pt, parent=undefined, untransformed=false){
        this.parent = parent || legend_node;
        this.svg_elem = d3.select(this.parent);
        this.id = id;
        this.strokeWeight = 4;
        this.stroke_color = "rgb(0, 0, 0)";

        if(!untransformed){
            let zoom_param = svg_map.__zoom;
            this.pt1 = [(origin_pt[0] - zoom_param.x )/ zoom_param.k, (origin_pt[1] - zoom_param.y) / zoom_param.k];
        } else {
            this.pt1 = origin_pt;
        }
        let self = this;
        this.drag_behavior = d3.drag()
             .subject(function() {
                    let t = d3.select(this.querySelector("ellipse"));
                    return {
                        x: +t.attr("cx"),
                        y: +t.attr("cy"),
                        map_locked: map_div.select("#hand_button").classed("locked") ? true : false
                    };
              })
            .on("start", () => {
                d3.event.sourceEvent.stopPropagation();
                handle_click_hand("lock");
              })
            .on("end", () => {
                if(d3.event.subject && !d3.event.subject.map_locked)
                    handle_click_hand("unlock");  // zoom.on("zoom", zoom_without_redraw);
              })
            .on("drag", function(){
                d3.event.sourceEvent.preventDefault();
                let _t = this.querySelector("ellipse"),
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

    draw(){
        let context_menu = new ContextMenu(),
            getItems = () =>  [
                {"name": i18next.t("app_page.common.edit_style"), "action": () => { this.editStyle(); }},
                {"name": i18next.t("app_page.common.up_element"), "action": () => { this.up_element(); }},
                {"name": i18next.t("app_page.common.down_element"), "action": () => { this.down_element(); }},
                {"name": i18next.t("app_page.common.delete"), "action": () => { this.ellipse.remove(); }}
            ];

        this.ellipse = this.svg_elem.append('g')
                .attrs({"class": "user_ellipse legend_features legend scalable-legend", "id": this.id, transform: svg_map.__zoom.toString()});

        this.ellipse.insert("ellipse")
            .attrs({"class": "legend_features", "rx": 30, "ry": 40,
        			      "cx": this.pt1[0], "cy": this.pt1[1]})
            .styles({"stroke-width": this.strokeWeight,
                      stroke: this.stroke_color, fill: "rgb(255, 255, 255)",
                      "fill-opacity": 0});

        this.ellipse.call(this.drag_behavior);

        this.ellipse.on("contextmenu", () => {
            context_menu.showMenu(d3.event, document.body, getItems());
        });
        this.ellipse.on('dblclick', () => {
            d3.event.preventDefault();
            d3.event.stopPropagation();
            this.handle_ctrl_pt();
        });
    }

    up_element(){
        up_legend(this.ellipse.node());
    }

    down_element(){
        down_legend(this.ellipse.node());
    }

    calcAngle(){
        let ellipse_elem = this.ellipse.node().querySelector("ellipse");
        let dx = ellipse_elem.rx.baseVal.value - this.pt1[0],
            dy = ellipse_elem.ry.baseVal.value - this.pt1[1];
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    calcDestFromOAD(origin, angle, distance){
        let theta = angle / (180 / Math.PI),
            dx = distance * Math.cos(theta),
            dy = distance * Math.sin(theta);
        return [origin[0] + dx, origin[1] + dy]
    }

    editStyle(){
        let self = this,
            ellipse_elem = self.ellipse.node().querySelector("ellipse"),
            zoom_param = svg_map.__zoom,
            map_locked = map_div.select("#hand_button").classed("locked") ? true : false,
            current_options = {
                pt1: this.pt1.slice(),
                rx: ellipse_elem.rx.baseVal.value,
                ry: ellipse_elem.ry.baseVal.value
            };
       let angle = (-this.calcAngle()).toFixed(0);

        if(!map_locked) handle_click_hand('lock');
        make_confirm_dialog2("styleBoxEllipse", i18next.t("app_page.ellipse_edit_box.title"), {widthFitContent: true})
            .then(function(confirmed){
                map.selectAll(".ctrl_pt").remove();
                if(confirmed) {
                    // Store shorcut of useful values :
                    self.strokeWeight = ellipse_elem.style.strokeWidth;
                    self.stroke_color = ellipse_elem.style.stroke;
                } else {
                    //Rollback on initials parameters :
                    self.pt1 = current_options.pt1.slice();
                    ellipse_elem.style.strokeWidth = self.strokeWeight;
                    ellipse_elem.style.stroke = self.stroke_color;
                }
                if(!map_locked) handle_click_hand('unlock');
            });
        let box_content = d3.select(".styleBoxEllipse").select(".modal-body").insert("div").attr("id", "styleBoxEllipse");
        let s1 = box_content.append("p");
        s1.append("p")
            .style("margin", "auto")
            .html(i18next.t("app_page.ellipse_edit_box.stroke_width"));
        s1.append("input")
            .attrs({type: "range", id: "ellipse_strokeWeight", min: 0, max: 34, step: 0.1, value: self.strokeWeight})
            .styles({width: "80px", "vertical-align": "middle"})
            .on("change", function(){
                ellipse_elem.style.strokeWidth = this.value;
                txt_line_weight.html(this.value + "px");
            });
        let txt_line_weight = s1.append("span").html(self.strokeWeight + " px");

        let s2 = box_content.append("p").style("margin", "auto");
        s2.append("p")
            .style("margin", "auto")
            .html(i18next.t("app_page.ellipse_edit_box.stroke_color"));
        s2.append("input")
            .attrs({type: "color", id: "ellipse_strokeColor", value: self.stroke_color})
            .on("change", function(){
                ellipse_elem.style.stroke = this.value;
            });
      //  let s2b = box_content.append("p").attr('class', 'line_elem')
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

    handle_ctrl_pt(){
        let self = this,
            ellipse_elem = self.ellipse.node().querySelector("ellipse"),
            zoom_param = svg_map.__zoom,
            map_locked = map_div.select("#hand_button").classed("locked") ? true : false;

        let cleanup_edit_state = () => {
            map.selectAll('.ctrl_pt').remove();
            self.ellipse.call(self.drag_behavior);
            self.ellipse.on('dblclick', () => {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                self.handle_ctrl_pt();
            });
            document.getElementById('hand_button').onclick = handle_click_hand;
        };

        // Change the behavior of the 'lock' button :
        document.getElementById('hand_button').onclick = function(){
            cleanup_edit_state();
            handle_click_hand();
        };

        // Desactive the ability to drag the ellipse :
        self.ellipse.on('.drag', null);
        // Desactive the ability to zoom/move on the map ;
        handle_click_hand('lock');

        let tmp_start_point = map.append("rect")
            .attr("class", "ctrl_pt").attr('id', 'pt1')
            .attr("x", (self.pt1[0] - ellipse_elem.rx.baseVal.value) * zoom_param.k + zoom_param.x)
            .attr("y", self.pt1[1] * zoom_param.k + zoom_param.y)
            .attr("height", 6).attr("width", 6)
            .style("fill", "red")
            .style("cursor", "grab")
            .call(d3.drag().on("drag", function(){
                let t = d3.select(this);
                t.attr("x", d3.event.x);
                let dist = self.pt1[0] - (d3.event.x - zoom_param.x) / zoom_param.k;
                // let dist = self.pt1[0] - (d3.event.x / zoom_param.k - zoom_param.x);
                ellipse_elem.rx.baseVal.value = dist;
            }));
        let tmp_end_point = map.append("rect")
            .attrs({class: 'ctrl_pt', height: 6, width: 6, id: 'pt2',
                    x: self.pt1[0] * zoom_param.k + zoom_param.x, y: (self.pt1[1] - ellipse_elem.ry.baseVal.value) * zoom_param.k + zoom_param.y})
            .styles({fill: 'red', cursor: 'grab'})
            .call(d3.drag().on("drag", function(){
                let t = d3.select(this);
                t.attr("y", d3.event.y);
                let dist = self.pt1[1] - (d3.event.y - zoom_param.y) / zoom_param.k;
                ellipse_elem.ry.baseVal.value = dist;
            }));

        self.ellipse.on('dblclick', function(){
            d3.event.stopPropagation();
            d3.event.preventDefault();
            cleanup_edit_state();
            if(!map_locked){
                handle_click_hand('unlock');
            }
        });
    }
 }
