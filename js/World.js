function World() {
    this.time = {
        hours: 0,
        minutes: 0
    };
    this.stop_time = {
        hours: 0,
        minutes: 0
    };
    this.bus = {
        bus_count: 0,
        interval: 0,
        seats: 0,
        price: 0,
        fuel_cons: 19
    };
    this.salary = {
        driver: 1000,
        conductor: 500
    };
    this.workers = {
        drivers: 0,
        conductors: 0
    };
    this.stops = [];
    this.buses = [];
    this.timerId = 0;
    this.tick = 10;
    this.worktime = 0;
    this.fuel_cost = 28;
    this.routeInfo = {
        travel_time: 0,
        travels_count: 0,
        travels_distance: 0
    };
    this.continue = true;
    this.initWorldTime();
    this.getSalaries();
    this.getBusInfo();
    this.getStops();
    this.getNumOfWorkers();
    this.spawnBusses();
    this.getFullAveragePassengers();
    this.onWorldCreated();
}

World.prototype.initWorldTime = function () {
    var time = getById("day-start").value.split(':');
    //var stop_time = getById("day-end").value.split(':');
    var stop_time = document.getElementsByClassName("end")[document.getElementsByClassName("end").length-1].value.split(':');
    if (isNaN(parseInt(time[0])) || isNaN(parseInt(time[1])) || isNaN(parseInt(stop_time[0])) || isNaN(parseInt(stop_time[1]))) {
        this.continue = false;
        return showError('Заполните поле "Время работы маршрута"');
    }
    else {
        this.time.hours = parseInt(time[0]);
        this.time.minutes = parseInt(time[1]);
        this.stop_time.hours = parseInt(stop_time[0]);
        this.stop_time.minutes = parseInt(stop_time[1]);
    }
    var date1 = new Date(2000, 0, 1, this.time.hours, this.time.minutes);
    var dayz = this.time.hours > this.stop_time.hours ? 2 : 1;
    var date2 = new Date(2000, 0, dayz, this.stop_time.hours, this.stop_time.minutes);
    this.worktime = (date2 - date1) / 1000;
};

World.prototype.getBusInfo = function () {
    var self = this;
    if (self.continue) {
        self.bus.bus_count = parseInt(getById("bus_count").innerHTML);
        self.bus.interval = parseInt(getById("interval").innerHTML);
        self.bus.seats = parseInt(getById("seats").innerHTML);
        self.bus.price = parseInt(getById("price").innerHTML);
    }
};

World.prototype.getNumOfWorkers = function () {
    var self = this;
    if (self.continue) {
        self.workers.drivers = parseInt(getById("number_of_drivers").innerHTML);
        self.workers.conductors = parseInt(getById("number_of_conductors").innerHTML);
    }
};

World.prototype.getSalaries = function () {
    var self = this;
    if (self.continue) {
        self.salary.driver = (parseInt(getById("driver_salary").innerHTML) / 30) * 1000;
        self.salary.conductor = (parseInt(getById("conductor_salary").innerHTML) / 30) * 1000;
    }
};

World.prototype.getStops = function () {
    var self = this;
    if (self.continue) {
        self.stops = self.stops.concat(map.getStops());
        if (self.stops.length <= 2) {
            self.continue = false;
            return showError("Ваш маршрут должен содержать не менее 3 остановок");
        }
    }
};

World.prototype.spawnBusses = function () {
    if (this.continue) {
        for (var i = 0; i < this.bus.bus_count; i++) {
            this.deployBus();
        }
    }
};

World.prototype.deployBus = function () {
    var self = this;
    if (self.continue) {
        var start_stop = self.stops[0];
        var bus = new Bus(self.bus.seats, self.time, start_stop);
        self.buses.push(bus);
    }
};

World.prototype.getFullAveragePassengers = function () {
    var pass = document.getElementsByClassName("people");
    var values = [];
    for (var i = 0; i<pass.length; i++) {
        if (pass[i].value === "") {
            values.push(3);
        }
        else {
            values.push(parseInt(pass[i].value));
        }
    }
    return values.reduce(function(a, b) {
        return a + b;
    })/values.length;
};

World.prototype.onWorldCreated = function () {
    this.getTravelTime();
};

World.prototype.getTravelTime = function () {
    if (this.continue) {
        var dist_time = map.getRoadDuration();
        var interval_time = this.bus.interval * 60;
        var stops_time = this.stops.length * 15;
        this.routeInfo.travel_time = dist_time * 2 + stops_time * 2 + interval_time;
        if (this.worktime < this.routeInfo.travel_time) {
            this.continue = false;
            return showError('Длительность маршрута не может быть больше, чем рабочий день')
        }
        else {
            this.routeInfo.travels_count = parseInt(this.worktime / this.routeInfo.travel_time);
            this.routeInfo.travels_distance = this.routeInfo.travels_count * (map.getRoadDistance() * 2);
            this.routeInfo.gasoline = ((this.routeInfo.travels_distance / 1000) / 100) * this.bus.fuel_cons;
            this.routeInfo.gasoline_cost = this.routeInfo.gasoline * this.fuel_cost;
            this.routeInfo.driver_salary = this.salary.driver;
            this.routeInfo.conductor_salary = this.salary.conductor;
            this.routeInfo.expenses = (this.salary.conductor * this.workers.conductors) + (this.salary.driver * this.workers.drivers) + (this.routeInfo.gasoline_cost * this.bus.bus_count);


            // Passengers
            var aver_pass = this.getFullAveragePassengers();
            var aver_in = 0;
            if (this.bus.price <= 20) {
                aver_in = aver_pass * this.stops.length * 2 * (1 + (20 - this.bus.price) * 0.05);
                if (aver_in <= 0) {
                    aver_in = 0
                }
            } else {
                var koeff = 1 - ((this.bus.price - 20) * 0.05);
                aver_in = aver_pass * this.stops.length * 2 * koeff;
                if (aver_in <= 0) {
                    aver_in = 0
                }
            }
            this.routeInfo.income = aver_in * parseInt(this.routeInfo.travels_count) * ((((this.routeInfo.travel_time - interval_time) / interval_time) < this.bus.bus_count) ? ((this.routeInfo.travel_time - interval_time) / interval_time) : this.bus.bus_count) * this.bus.price;
            this.routeInfo.profit = this.routeInfo.income - this.routeInfo.expenses;
            showModelModal(this.routeInfo);
        }
    }
};