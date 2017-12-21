var STOPS_VISIBLE = false;
var dragging = null;
var tarpos = null;
var hideErrorTimer = null;

function init() {
    initSliders();
}

function showStops(stops) {
    var i = 0;
    var list = document.getElementById('stops-list');
    list.innerHTML = "";

    // check delete button
    if (stops.length > 0) {
        getById('delete-last-stop').style.display = 'block';
    } else {
        getById('delete-last-stop').style.display = 'none';
    }

    for (var it in stops) {
        if (i > 3) {
            var showmore_btn = document.createElement('div');
            showmore_btn.id = 'show-all-stops';
            showmore_btn.innerHTML = 'Показать остальные';
            showmore_btn.onclick = toggleStopsVisible;
            list.appendChild(showmore_btn);

            if (STOPS_VISIBLE) {
                showAllStops();
            }

            break;
        }

        list.appendChild(createStopItem(stops[it].name, stops[it].coords));
        i++;
    }
}

function createStopItem(name, coords) {
    var stop_elem = document.createElement('div');
    stop_elem.className = 'stop-item';
    stop_elem.innerHTML = name;
    stop_elem.onclick = function () {
        map.zoomByCoords(coords);
    };
    return stop_elem;
}

function toggleStopsVisible() {
    if (!STOPS_VISIBLE) {
        showAllStops();
    } else {
        hideAllStops();
    }
}

function showAllStops() {
    var stops = map.getStops();
    var full_list = document.createElement('div');
    full_list.id = 'full-stops-list';
    for (var i = 4; i < stops.length; i++) {
        full_list.appendChild(createStopItem(stops[i].name, stops[i].coords));
    }
    document.getElementById('show-all-stops').innerHTML = 'Скрыть остальные';
    document.getElementById('stops-list').appendChild(full_list);

    if (!STOPS_VISIBLE) {
        $('#left-main').animate({'width': '+=20px'}, 'fast', initSliders);
    }

    STOPS_VISIBLE = true;
}

function hideAllStops() {
    remove(document.getElementById('full-stops-list'));
    document.getElementById('show-all-stops').innerHTML = 'Показать остальные';

    if (STOPS_VISIBLE) {
        $('#left-main').animate({'width': '-=20px'}, 'fast', initSliders);
    }

    STOPS_VISIBLE = false;
}

function showModelModal(info) {
    var content_title = '<h3 class="modal-title">Расчет маршрута</h3>';
    var content_description = '<p class="modal-description">Информация о данном маршруте. Данная информация не является точной, а лишь' +
        ' примерно показывает рентабельность Вашего маршрута.</p>';
    var content_divider = '<div class="modal-divider"></div>';
    var expenses = '<h3 class="modal-title">Примерные затраты в день</h3>';
    expenses += '<p class="modal-description">Время <b>одного рейса:</b> ' + (info.travel_time/60).toFixed(1) + ' мин.</p>';
    expenses += '<p class="modal-description"><b>Рейсов в день</b> (каждый автобус):  ' + (info.travels_count) + '</p>';
    expenses += '<p class="modal-description"><b>Общее расстояние,</b> которое проедет каждый автобус: ' + (info.travels_distance/1000).toFixed(3) + ' км.</p>';
    expenses += '<p class="modal-description"><b>Расход топлива</b> на каждый автобус: ' + (info.gasoline).toFixed(3) + ' литр(-ов).</p>';
    expenses += '<p class="modal-description"><b>Стоимость топлива</b> (один автобус): ' + (info.gasoline_cost).toFixed(2) + ' руб.</p>';
    expenses += '<p class="modal-description"><b>Зарплата водителя</b> (в день): ' + (info.driver_salary).toFixed(2) + ' руб.</p>';
    expenses += '<p class="modal-description"><b>Зарплата кондуктора</b> (в день): ' + (info.conductor_salary).toFixed(2) + ' руб.</p>';
    expenses += '<p class="modal-description-sum"><b>Итого</b>: ' + (info.expenses).toFixed(2) + ' руб.</p><br>';
    expenses += '<h3 class="modal-title">Примерная прибыль и доход в день</h3>';
    expenses += '<p class="modal-description"><b>Доходы в день:</b> ' + info.income.toFixed(2) + ' руб.</p>';
    expenses += '<p class="modal-description"><b>Прибыль в день:</b> ' + info.profit.toFixed(2) + ' руб.</p>';

    var content = content_title + content_description + content_divider + expenses;
    showModal(content);
}

function showModal(content) {
    var modal = document.createElement('div');
    modal.id = "modal_" + Math.random()*100;
    modal.className = 'modal';
    var modal_content = document.createElement('div');
    modal_content.className = 'modal-content fadeInDown animated';
    modal_content.innerHTML += content;
    modal.appendChild(modal_content);
    document.body.appendChild(modal);
}

function hideModal(event) {
    var modals = document.getElementsByClassName('modal');
    for (var modal in modals) {
        var cmodal = modals[modal];
        if (event.target === cmodal) {
            cmodal.childNodes[0].className = 'modal-content fadeOutDown animated';
            cmodal.className = 'modal fadeOut animated';
            var delay = parseFloat($(cmodal).css('animation-duration')) * 1000;
            setTimeout(function() { destroyModal(cmodal); }, delay);
            break;
        }
    }
}

function destroyModal(modal) {
    $(modal).remove();
}

function showLoader() {
    var loader = document.getElementById('loader-box');
    $(loader).stop(true, false).fadeIn();
}

function hideLoader() {
    var loader = document.getElementById('loader-box');
    $(loader).stop(true, false).fadeOut();
}

function showLeftMenu() {
    $('#left-main').animate({'left': '-240px'}, 'fast');
}

function hideLeftMenu() {
    $('#left-main').animate({'left': '0px'}, 'fast');
}

function remove(elem) {
    elem.parentNode.removeChild(elem);
    return false;
}

function dragStart(event) {
    if (event.target.className == 'slider-draggable') {
        dragging = event.target;
        tarpos = event.pageX - dragging.offsetLeft;
    }
    document.body.style.cursor = 'default';
}

function dragSlider(e) {
    if (dragging) {
        var line = dragging.parentNode;
        var counter = dragging.parentNode.parentNode.childNodes[1].childNodes[3];
        var x = e.clientX - tarpos;
        if (x > line.offsetLeft && x < line.offsetLeft + line.offsetWidth) {
            // get percentage
            var maxval = parseInt(dragging.getAttribute('data-max'));
            var mixval = parseInt(dragging.getAttribute('data-min'));
            var pos = dragging.offsetLeft;
            var value = Math.round(((pos - line.offsetLeft) / line.offsetWidth) * 100);
            counter.innerHTML = value;

            var npos = Math.round(((x - line.offsetLeft) / line.offsetWidth) * 100);

            if (maxval) {
                if (npos > maxval) {
                    return;
                }
            }
            if (mixval) {
                if (npos < mixval) {
                    return;
                }
            }
            dragging.style.left = x + "px";
        }
    }
}

function updateMapInfo() {
    updateTrackDistance();
    updateTrackDuration();
}

function updateTrackDistance() {
    var elem = getById('track-distance');
    var distance = map.getRoadDistance();
    var units = 'м.';
    if (distance > 1000) {
        distance /= 1000;
        units = 'км.'
    } else {
        units = 'м.'
    }

    if (!distance) {
        distance = 0;
        units = 'м.'
    }
    elem.innerHTML = '<span>'+ distance + '&nbsp;' + units + '</span>';
}

function updateTrackDuration() {
    var elem = getById('track-duration');
    var duration = map.getRoadDuration();
    var formatted = '0 ч. 0 мин. 0 сек.';
    if (duration) {
        formatted = secondsToHms(duration);
    }
    elem.innerHTML = '<span>'+ formatted +'</span>';
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    return h + " ч. " + m + " мин." + s + " сек.";
}

function initSliders() {
    $('.slide-minmax-border').remove();
    var sliders = document.getElementsByClassName('slider-draggable');
    for (var it = 0; it < sliders.length; it++) {
        var elem = sliders[it];
        var line = elem.parentNode;
        var start = elem.parentNode.parentNode.childNodes[1].childNodes[3];
        var pos = ((parseInt(start.innerHTML) * line.offsetWidth) / 100) + line.offsetLeft;
        elem.style.left = pos + 'px';

        // setup min/max borders
        var maxval = parseInt(elem.getAttribute('data-max'));
        var mixval = parseInt(elem.getAttribute('data-min'));

        if (maxval) {
            createMaxBorder(elem, maxval);
        }

        if (mixval) {
            createMinBorder(elem, mixval);
        }
    }
}

function createMaxBorder(slider, maxval) {
    var line = slider.parentNode;
    var pos = getSliderPosByValue(slider, maxval);
    var border = document.createElement('div');
    border.className = 'slide-minmax-border';
    border.style.left = pos + slider.offsetWidth + 'px';
    line.appendChild(border);
}

function createMinBorder(slider, mixval) {
    var line = slider.parentNode;
    var pos = getSliderPosByValue(slider, mixval);
    var border = document.createElement('div');
    border.className = 'slide-minmax-border';
    border.style.left = pos + 'px';
    line.appendChild(border);
}

function getSliderPosByValue(elem, val) {
    var line = elem.parentNode;
    return ((parseInt(val) * line.offsetWidth) / 100) + line.offsetLeft;
}

function dragEnd() {
    if (dragging !== null) {
        dragging = null;
    }
    document.body.style.cursor = 'auto';
}

function showError(text) {
    clearInterval(hideErrorTimer);
    hideErrorTimer = setTimeout(hideError, 3000);

    var err_box = $('#error-box');
    $('#err-text').html(text);
    err_box.stop(true, false).slideDown('fast');
}

function hideError() {
    $('#error-box').slideUp('fast');
}

function getById(id) {
    return document.getElementById(id);
}

function addMoreTimings() {
    var section = document.getElementsByClassName("text-fill")[0];
    var start = document.createElement("input");
    var text = document.createElement("span");
    var end = document.createElement("input");
    var people = document.createElement("input");
    start.setAttribute("id", "day-start");
    start.className="text-fill-input";
    start.setAttribute("type","time");
    section.appendChild(start);

    text.setAttribute("style", "font-size: 12px; margin-left: 5px");
    text.innerHTML += "до";
    section.appendChild(text);

    end.setAttribute("id", "day-end");
    end.className="text-fill-input end";
    end.setAttribute("type","time");
    end.setAttribute("style", "margin-left: 3px");
    section.appendChild(end);

    people.setAttribute("id", "day-people");
    people.className="text-fill-input people";
    people.setAttribute("style", "margin-left: 4px;");
    section.appendChild(people);
    /*section.innerHTML += '<input id="day-start" class="text-fill-input" type="time" /> <span style="font-size: 12px;">до</span>';
    section.innerHTML += ' <input id="day-end"  class="text-fill-input" type="time" />';
    section.innerHTML += '<input id="day-people" class="text-fill-input" style="margin-left: 4px;" />';*/
}

window.onmousedown = function (event) {
    dragStart(event);
};

window.onmouseup = function (event) {
    dragEnd(event);
};

window.onmousemove = function (event) {
    dragSlider(event);
};

window.onclick = function(event) {
    hideModal(event);
};

