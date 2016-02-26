var sock = new SockJS(location.href + 'ws');

sock.onopen = function () {
    console.log('WS connection open');
};

sock.onclose = function () {
    // TODO : Add warning when we loose connection
    // TODO : Support reconnecting
    console.log('WS connection closed');
};

// Helper function to format time
function tsToTimeString(aTimestamp) {
    var time = new Date(aTimestamp);
    return time.getHours() + ':' + time.getMinutes() + ' ' + time.getSeconds() + 's';
}

// max items to display
var count = 100;
var counter = 1;

$.ajax({url: "/last"})
    .done(function (response) {

        var LabelArray = response.data.map(function (aValue) {
            return tsToTimeString(aValue.time);
        });
        var DataArray = response.data.map(function (aValue) {
            return aValue.ping;
        });

        // Fill the Data/Label arrays to avoid strange animation/display on the graph
        if (response.data.length < count) {
            DataArray = new Array(count - response.data.length).fill(0).concat(DataArray);
            LabelArray = new Array(count - response.data.length).fill(' ').concat(LabelArray);
        } else {
            DataArray = DataArray.slice(0, count);
            LabelArray = LabelArray.slice(0, count);
        }

        var canvas = document.getElementById('timeline');
        var ctx = canvas.getContext('2d');

        var startingData = {
            labels: LabelArray,
            datasets: [
                {
                    fillColor: 'rgba(12, 131, 0,0.1)',
                    strokeColor: "rgba(12, 131, 0,0.5)",
                    pointColor: "rgba(12, 131, 0,0.5)",
                    pointStrokeColor: "#fff",
                    data: DataArray
                }
            ]
        };


        var myLiveChart = new Chart(ctx).Line(startingData, {
            animationSteps: 8,
            scaleShowVerticalLines: false,
            bezierCurve: false,
            pointHitDetectionRadius: 2,
            pointDotRadius: 2,
            pointDot: false,
            responsive: true,
            datasetStrokeWidth: 1
        });

        sock.onmessage = function (e) {
            var data = JSON.parse(e.data);
            myLiveChart.addData([data.ping], tsToTimeString(data.time));
            myLiveChart.removeData();
        };

    });
