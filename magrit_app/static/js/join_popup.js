"use strict";

function handle_join(){
    var layer_name = Object.getOwnPropertyNames(user_data);

    if(!(layer_name.length === 1 && joined_dataset.length === 1)){
        swal("",
             i18next.t("app_page.join_box.unable_join"),
             "error");
        return;
    } else if(field_join_map.length != 0){
        make_confirm_dialog2("dialogBox", undefined, {html_content: i18next.t("app_page.join_box.ask_forget_join")})
            .then( confirmed => {
                if(confirmed){
                    valid_join_check_display();
                    field_join_map = [];
                    remove_existing_jointure(layer_name);
                    createJoinBox(layer_name[0]);
                    }
                });
    } else if(user_data[layer_name].length != joined_dataset[0].length){
        make_confirm_dialog2("dialogBox", undefined, {html_content: i18next.t("app_page.join_box.ask_diff_nb_features")})
            .then(confirmed => {
                if(confirmed){ createJoinBox(layer_name[0]); }
        });
    } else {
        createJoinBox(layer_name[0]);
    }
}

// Function called to update the menu according to user operation (triggered when layers/dataset are added and after a join operation)
function valid_join_check_display(val, prop){
    if(!val){
        let ext_dataset_img = document.getElementById("img_data_ext");
        ext_dataset_img.setAttribute("src", "/static/img/b/joinfalse.svg");
        ext_dataset_img.setAttribute("alt", "Non-validated join");
        ext_dataset_img.style.width = "28px";
        ext_dataset_img.style.height = "28px";
        ext_dataset_img.onclick = handle_join;

        let join_sec = document.getElementById("join_section");
        join_sec.innerHTML = [prop, i18next.t('app_page.join_box.state_not_joined')].join('');

        let button = document.createElement("button");
        button.setAttribute("id", "join_button");
        button.style.display = "inline";
        button.innerHTML = '<button style="font-size: 11px;" class="button_st3" id="_join_button">' + i18next.t("app_page.join_box.button_join") + '</button>'
        button.onclick = handle_join;
        join_sec.appendChild(button);
    } else {
        let ext_dataset_img = document.getElementById("img_data_ext");
        ext_dataset_img.setAttribute("src", "/static/img/b/jointrue.svg");
        ext_dataset_img.setAttribute("alt", "Validated join");
        ext_dataset_img.style.width = "28px";
        ext_dataset_img.style.height = "28px";
        ext_dataset_img.onclick = null;

        let [v1, v2] = prop.split("/").map(d => +d);

        let join_sec = document.getElementById("join_section");
        join_sec.innerHTML = [' <b>', prop, i18next.t("app_page.join_box.match", {count: v1}), '</b>'].join(' ');

        let button = document.createElement("button");
        button.setAttribute("id", "join_button");
        button.style.display = "inline";
        button.innerHTML = [" - <i> ", i18next.t("app_page.join_box.change_field"), " </i>"].join('');
        button.onclick = handle_join;
        join_sec.appendChild(button);
    }
}

// Where the real join is done
// Its two main results are:
//    -the update of the global "field_join_map" array
//       (storing the relation between index of the geometry layer and index of the external dataset)
//    -the update of the global "user_data" object, adding actualy the value to each object representing each feature of the layer
function valid_join_on(layer_name, field1, field2){
    var join_values1 = [],
        join_values2 = [],
        hits = 0,
        val = undefined;

    field_join_map = [];

    for(let i=0, len=joined_dataset[0].length; i<len; i++){
        join_values2.push(joined_dataset[0][i][field2]);
    }
    for(let i=0, len=user_data[layer_name].length; i<len; i++){
        join_values1.push(user_data[layer_name][i][field1]);
    }

    if(has_duplicate(join_values1) || has_duplicate(join_values2)){
      swal("", i18next.t("app_page.join_box.error_not_uniques"), "warning");
      return;
    }

    if(typeof join_values1[0] === "number" && typeof join_values2[0] === "string"){
        for(let i=0, len=join_values1.length; i<len; i++){
            val = join_values2.indexOf(String(join_values1[i]));
            if(val != -1) { field_join_map.push(val); hits++; }
            else { field_join_map.push(undefined); }
        }
    } else if(typeof join_values2[0] === "number" && typeof join_values1[0] === "string"){
        for(let i=0, len=join_values1.length; i<len; i++){
            val = join_values2.indexOf(Number(join_values1[i]));
            if(val != -1) { field_join_map.push(val); hits++; }
            else { field_join_map.push(undefined); }
        }
    } else if(typeof join_values2[0] === "number" && typeof join_values1[0] === "number"){
        for(let i=0, len=join_values1.length; i<len; i++){
            val = join_values2.indexOf(join_values1[i]);
            if(val != -1) { field_join_map.push(val); hits++; }
            else { field_join_map.push(undefined); }
        }
    } else {
        for(let i=0, len=join_values1.length; i<len; i++){
            val = join_values2.indexOf(String(join_values1[i]));
            if(val != -1) { field_join_map.push(val); hits++; }
            else { field_join_map.push(undefined); }
        }
    }

    var prop = [hits, "/", join_values1.length].join(""),
        f_name = "";

    if(hits == join_values1.length){
        swal({title: "",
              text: i18next.t("app_page.common.success"),
              type: "success",
              allowOutsideClick: true});
        let fields_name_to_add = Object.getOwnPropertyNames(joined_dataset[0][0]);
        for(let i=0, len=join_values1.length; i<len; i++){
            val = field_join_map[i];
            for(let j=0, leng=fields_name_to_add.length; j<leng; j++){
                f_name = fields_name_to_add[j];
                if(f_name.length > 0){
                    user_data[layer_name][i][f_name] = joined_dataset[0][val][f_name];
                }
            }
        }
        valid_join_check_display(true, prop);
        return Promise.resolve(true);
    } else if(hits > 0){
        return swal({title: i18next.t("app_page.common.confirm") + "!",
              text: i18next.t("app_page.join_box.partial_join", {ratio: prop}),
              allowOutsideClick: false,
              allowEscapeKey: true,
              type: "question",
              showConfirmButton: true,
              showCancelButton: true,
              confirmButtonText: i18next.t("app_page.common.yes"),
              cancelButtonText: i18next.t("app_page.common.no"),
            }).then(() => {
                let fields_name_to_add = Object.getOwnPropertyNames(joined_dataset[0][0])
                    // ,i_id = fields_name_to_add.indexOf("id");

                // if(i_id > -1){ fields_name_to_add.splice(i_id, 1); }
                for(let i=0, len=field_join_map.length; i<len; i++){
                    val = field_join_map[i];
                    for(let j=0, leng=fields_name_to_add.length; j<leng; j++){
                        f_name = fields_name_to_add[j];
                        if(f_name.length > 0){
                            let t_val;
                            if(val == undefined)
                              t_val = null;
                            else if(joined_dataset[0][val][f_name] == "")
                              t_val = null;
                            else
                              t_val = joined_dataset[0][val][f_name];
                            user_data[layer_name][i][f_name] = val != undefined ? joined_dataset[0][val][f_name] : null ;
                        }
                    }
                }
                valid_join_check_display(true, prop);
                return Promise.resolve(true);
            }, dismiss => {
                field_join_map = [];
                return Promise.resolve(false);
            });
    } else {
        swal("",
             i18next.t("app_page.join_box.no_match", {field1: field1, field2: field2}),
             "error");
        field_join_map = [];
        return Promise.resolve(false);
    }
}

// Function creating the join box , filled by to "select" input linked one to
// the geometry layer and the other to the external dataset, in order to choose
// the common field to do the join.
function createJoinBox(layer){
    var geom_layer_fields = [...current_layers[layer].original_fields.keys()],
        ext_dataset_fields = Object.getOwnPropertyNames(joined_dataset[0][0]),
        button1 = ["<select id=button_field1>"],
        button2 = ["<select id=button_field2>"],
        last_choice = {"field1": geom_layer_fields[0], "field2": ext_dataset_fields[0]};

    for(let i=0, len=geom_layer_fields.length; i<len; i++)
        button1.push(['<option value="', geom_layer_fields[i], '">', geom_layer_fields[i], '</option>'].join(''));
    button1.push("</select>");

    for(let i=0, len=ext_dataset_fields.length; i<len; i++)
        if(ext_dataset_fields[i].length > 0)
            button2.push(['<option value="', ext_dataset_fields[i], '">', ext_dataset_fields[i], '</option>'].join(''));
    button2.push("</select>");

    let inner_box = [
         '<p><b><i>',
         i18next.t("app_page.join_box.select_fields"), '</i></b></p>',
         '<div style="padding:10px"><p>',
         i18next.t("app_page.join_box.geom_layer_field"), '</p>',
         button1.join(''), '<em style="float:right;">(', layer, ')</em></div>',
         '<div style="padding:15px 10px 10px"><p>',
         i18next.t("app_page.join_box.ext_dataset_field"), '<br></p>',
         button2.join(''), '<em style="float:right;">(', dataset_name, '.csv)</em></div>',
         '<br><p><strong>', i18next.t("app_page.join_box.ask_join"), '<strong></p></div>'
        ].join('');


    make_confirm_dialog2("joinBox", i18next.t("app_page.join_box.title"), {html_content: inner_box, widthFitContent: true})
        .then(confirmed => {
            if(confirmed){
                valid_join_on(layer, last_choice.field1, last_choice.field2)
                    .then(valid => { if(valid) make_box_type_fields(layer); });
            }
        });

    d3.select(".joinBox").styles({"text-align": "center", "line-height": "0.9em"});
    d3.select("#button_field1").style("float", "left").on("change", function(){last_choice.field1 = this.value;});
    d3.select("#button_field2").style("float", "left").on("change", function(){last_choice.field2 = this.value;});

}

const remove_existing_jointure = (layer_name) => {
    if(!user_data[layer_name] || user_data[layer_name].length < 1)
        return;
    let data_layer = user_data[layer_name],
        original_fields = current_layers[layer_name].original_fields,
        field_difference = Object.getOwnPropertyNames(data_layer[0]).filter(f => !original_fields.has(f)),
        nb_fields = field_difference.length;
    for(let i = 0, nb_ft = data_layer.length; i < nb_ft; i++){
        for(let j = 0; j < nb_fields; j++){
            delete data_layer[i][field_difference[j]];
        }
    }
};
