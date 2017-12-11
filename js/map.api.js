function GoogleMap() {
    this.styles = [
        {
            "featureType": "poi.business",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        }
    ];
    this.styledMap = new google.maps.StyledMapType(this.styles,
        {name: "Bustrack"});
    this.mapOptions = {
        zoom: 15,
        center: new google.maps.LatLng(56.3226512, 44.0074121),
        mapTypeControlOptions: {
            mapTypeIds: []
        }
    };
    this.directionServices = [new google.maps.DirectionsService];
    this.directionsDisplays = [new google.maps.DirectionsRenderer];
    this.stops = [];
    this.waypoints = [];
    this.paths = [];
    this.markers = [];
    this.marker_icon = "./img/iconmark.svg";
    this.actual_path = 0;
}

GoogleMap.prototype.initMap = function () {
    this.map = new google.maps.Map(document.getElementById('google-map'), this.mapOptions);
    this.map.mapTypes.set('map_style', this.styledMap);
    this.map.setMapTypeId('map_style');
    this.startDrawing();
    this.directionsDisplays[0].setMap(this.map);
    this.streetViewListener();
};

GoogleMap.prototype.getStops = function () {
    return this.stops;
};


GoogleMap.prototype.getRoadInfo = function (response) {
    var self = this;

    var distance = response.routes[0].legs[0].distance.value;
    var duration = response.routes[0].legs[0].duration.value;

    self.paths[self.actual_path].distances.push(distance);
    self.paths[self.actual_path].durations.push(duration);

    updateMapInfo();
};

GoogleMap.prototype.getRoadDistance = function() {
    var self = this;
    var distance = 0;
    self.paths.forEach(function (item) {
        distance += item.distances[item.distances.length-1];
    });
    if (self.stops.length < 2) distance = 0;
    return distance;
};

GoogleMap.prototype.getRoadDuration = function() {
    var self = this;
    var duration = 0;
    self.paths.forEach(function (item) {
        duration += item.durations[item.durations.length-1];
    });
    if (self.stops.length < 2) duration = 0;
    return duration;
};


GoogleMap.prototype.startDrawing = function () {
    var self = this;
    var service = new google.maps.places.PlacesService(self.map);
    self.map.addListener('click', function (event) {
        if (!event.placeId) {
            event.stop();
            return false;
        }
        showLoader();
        var placeId = event.placeId;
        service.getDetails({
            placeId: event.placeId
        }, function(place, status) {
            if (place.types[0] != "bus_station") {
                event.stop();
                hideLoader();
                return;
            }
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                hideLoader();
                var stop = {
                    name: place.name,
                    coords: new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng()),
                    placeId: placeId
                };
                self.stops.push(stop);
                showStops(self.stops);
                if (self.paths.length == 0) {
                    var path = {
                        start_point: new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng()),
                        prev_point: null,
                        waypoints: [],
                        distances: [],
                        durations: []
                    };
                    self.paths.push(path);
                    self.placeMarker(path.start_point);
                } else {

                    if (self.paths[self.actual_path].waypoints.length > 4) {
                        var new_path = {
                            start_point: self.paths[self.actual_path].prev_point,
                            prev_point: null,
                            waypoints: [],
                            distances: [],
                            durations: []
                        };
                        self.paths.push(new_path);
                        self.actual_path++;
                        self.directionServices.push(new google.maps.DirectionsService);
                        self.directionsDisplays.push(new google.maps.DirectionsRenderer);
                        self.directionsDisplays[self.actual_path].setMap(self.map);
                    }

                    var dest = new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng());
                    if (self.paths[self.actual_path].prev_point != null) {
                        self.paths[self.actual_path].waypoints.push({location: self.paths[self.actual_path].prev_point, stopover: false});
                    }
                    self.paths[self.actual_path].prev_point = dest;
                    self.drawDirections();
                }
            }
        });
        event.stop();
    });
};

GoogleMap.prototype.drawDirections = function (toDelete) {
    var self = this;
    self.placeMarker(self.paths[self.actual_path].prev_point);
    self.directionServices[self.actual_path].route({
        origin: self.paths[self.actual_path].start_point,
        destination: self.paths[self.actual_path].prev_point,
        waypoints: self.paths[self.actual_path].waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        provideRouteAlternatives: false,
        /**
         * Значение времени: Date(X),
         *    где X - нужное время в миллисекундах с 1 яндваря 1970 года
         *    Текущее время в миллисекундах: Date.now()
         * Возвращает время пути в response -> routes -> legs -> duration_in_traffic
         */
        drivingOptions: {
            departureTime: new Date(Date.now())
        }

    }, function(response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            if (!toDelete) {
                self.getRoadInfo(response);
                if (self.directionsDisplays[self.actual_path].getMap() !== google.maps.Map) self.directionsDisplays[self.actual_path].setMap(self.map);
            }
            self.directionsDisplays[self.actual_path].setDirections(response);
            self.directionsDisplays[self.actual_path].setOptions( {
                suppressMarkers: true,
                preserveViewport: true
            });
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
};

GoogleMap.prototype.placeMarker = function (coords) {
    var self = this;
    var marker =  new google.maps.Marker({
        position: coords,
        map: self.map,
        icon: self.marker_icon,
        animation: google.maps.Animation.DROP
    });
    self.markers.push(marker);
    return marker;
};

GoogleMap.prototype.zoomByCoords = function (endPosition) {
    var self = this;
    var n_intervals = 70;
    var T_msec = 250;
    var f_timeout, getStep, i, j, lat_array, lat_delta, lat_step, lng_array, lng_delta, lng_step, pan, ref, startPosition;
    getStep = function(delta) {
        return parseFloat(delta) / n_intervals;
    };
    startPosition = self.map.getCenter();
    lat_delta = endPosition.lat() - startPosition.lat();
    lng_delta = endPosition.lng() - startPosition.lng();
    lat_step = getStep(lat_delta);
    lng_step = getStep(lng_delta);
    lat_array = [];
    lng_array = [];
    for (i = j = 1, ref = n_intervals; j <= ref; i = j += +1) {
        lat_array.push(self.map.getCenter().lat() + i * lat_step);
        lng_array.push(self.map.getCenter().lng() + i * lng_step);
    }
    f_timeout = function(i, i_min, i_max) {
        return parseFloat(T_msec) / n_intervals;
    };
    pan = function(i) {
        if (i < lat_array.length) {
            return setTimeout(function() {
                self.map.panTo(new google.maps.LatLng({
                    lat: lat_array[i],
                    lng: lng_array[i]
                }));
                return pan(i + 1);
            }, f_timeout(i, 0, lat_array.length - 1));
        }
    };
    return pan(0);
};

GoogleMap.prototype.streetViewListener = function() {
    var self = this;
    var panorama = self.map.getStreetView();
    google.maps.event.addListener( panorama, 'visible_changed', function() {
        if (panorama.getVisible()) {
            showLeftMenu();
        } else {
            hideLeftMenu();
        }
    } );
};

GoogleMap.prototype.deleteLastPoint = function () {
    var self = this;
    if (self.paths[self.actual_path].waypoints.length === 0) {
        self.paths[self.actual_path].prev_point = self.paths[self.actual_path].start_point;
        self.directionsDisplays[self.actual_path].setMap(null);
        if (self.actual_path != 0) {
            self.paths.splice(self.actual_path, 1);
            self.actual_path--;
        }
    }
    else {
        self.paths[self.actual_path].distances.pop();
        self.paths[self.actual_path].durations.pop();
        self.paths[self.actual_path].prev_point = self.paths[self.actual_path].waypoints[self.paths[self.actual_path].waypoints.length - 1].location;
        self.paths[self.actual_path].waypoints.splice(self.paths[self.actual_path].waypoints.length-1, 1);
    }
    self.drawDirections(true);
    self.markers[self.markers.length - 1].setMap(null);
    if (self.markers.length > 1) self.markers[self.markers.length - 2].setMap(null);
    self.markers.splice(self.markers.length-2, 2);

    self.stops.pop();
    showStops(self.stops);

    if (self.stops.length == 1) self.paths[self.actual_path].prev_point = null;
    if (self.stops.length == 0) self.paths.splice(self.actual_path,1);

    updateMapInfo();
};
