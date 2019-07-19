function giantBombApiCall(gameName) {

  return new Promise(resolve => {
    let giantBombURL;

    console.log("game to be searched: " + gameName);
    giantBombURL = "https://cors-anywhere.herokuapp.com/https://www.giantbomb.com/api/search?api_key=0f5a567565f80ed0d9a43e0862315a17c315dc22&format=json&query=" + gameName + "&resources=game&limit=5"

    $.ajax({
      url: giantBombURL,
      method: "GET"
    }).then(function (response) {
      console.log(response.results);

      resolve(response.results);

      let newGame = {};
      for (let i = 0; i < response.results.length; i++) {

        // Restricting search to first result
        let res = response.results[i];

        // Grabbing info from GB API to show user
        let title = res.name;
        let system_type = res.platforms;
        let year_released = res.expected_release_year;

        // Grabbing info from GB API to store tacitly in database
        let api_url = res.api_detail_url;
        let giant_bomb_ID = res.guid;
        let box_art = res.image.medium_url;
        let description = res.deck;

        // Putting in some necessary defaults
        let is_physical = true;
        let is_beaten = false;

        newGame = {
          title,
          system_type,
          year_released,
          is_physical,
          is_beaten,
          api_url,
          giant_bomb_ID,
          box_art,
          description
        };

        let p = $("<p>");
        p.attr("data-api-url", api_url);
        p.text(JSON.stringify(newGame, null, 2));
        p.addClass("newgame");
        $("#results").append(p);
      }
    });
  })
}

$("#search-button").on("click", function () {
  let gameName = $("#search").val().trim();
  giantBombApiCall(gameName);
})

// Validates numbers entered into barcode scanner
function isNumber(evt) {
  var iKeyCode = (evt.which) ? evt.which : evt.keyCode
  if (iKeyCode != 46 && iKeyCode > 31 && (iKeyCode < 48 || iKeyCode > 57))
    return false;

  return true;
};

// Grabs typed barcode
let barcode;
$("#scanner_input").on("keyup", function () {
  let number = $(this).val();

  if (number.length < 10) {
    console.log("input isn't long enough to be a barcode");
    barcode = undefined;
  } else if (number.length > 13) {
    console.log("input is too long to be a barcode");
    barcode = undefined;
  } else {
    if (number !== barcode) {
      barcode = number;
      console.log(barcode);
    }
  }
});

$("#search-barcode").on("click", function () {
  if (!barcode) {
    console.log("there is no barcode to search")
  } else {
    console.log("barcode to be searched ", barcode);
    asyncTest(barcode);
  }
})

function searchBarcodeApi(barcode) {
  return new Promise(resolve => {
    let queryURL = "https://cors-anywhere.herokuapp.com/https://api.upcitemdb.com/prod/trial/lookup?upc=" + barcode
    $.ajax({
      url: queryURL,
      method: "GET"
    }).then(function (response) {
      console.log(response);
      resolve(response);
    });
  });
};


async function asyncTest(barcode) {
  const response = await searchBarcodeApi(barcode);
  gameName = response.items[0].title;
  giantBombApiCall(gameName);
}

$(function () {
  // Create the QuaggaJS config object for the live stream
  var liveStreamConfig = {
    inputStream: {
      type: "LiveStream",
      constraints: {
        width: {
          min: 640
        },
        height: {
          min: 480
        },
        aspectRatio: {
          min: 1,
          max: 100
        },
        facingMode: "environment" // or "user" for the front camera
      }
    },
    locator: {
      patchSize: "medium",
      halfSample: true
    },
    numOfWorkers: (navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4),
    decoder: {
      "readers": [{
        "format": "ean_reader",
        "config": {}
      }]
    },
    locate: true
  };
  // The fallback to the file API requires a different inputStream option. 
  // The rest is the same 
  var fileConfig = $.extend({},
    liveStreamConfig, {
      inputStream: {
        size: 800
      }
    }
  );
  // Start the live stream scanner when the modal opens
  $('#livestream_scanner').on('shown.bs.modal', function (e) {
    Quagga.init(
      liveStreamConfig,
      function (err) {
        if (err) {
          $('#livestream_scanner .modal-body .error').html(
            '<div class="alert alert-danger"><strong><i class="fa fa-exclamation-triangle"></i> ' +
            err.name + '</strong>: ' + err.message + '</div>');
          Quagga.stop();
          return;
        }
        Quagga.start();
      }
    );
  });

  // Make sure, QuaggaJS draws frames an lines around possible 
  // barcodes on the live stream
  Quagga.onProcessed(function (result) {
    var drawingCtx = Quagga.canvas.ctx.overlay,
      drawingCanvas = Quagga.canvas.dom.overlay;

    if (result) {
      if (result.boxes) {
        drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(
          drawingCanvas.getAttribute("height")));
        result.boxes.filter(function (box) {
          return box !== result.box;
        }).forEach(function (box) {
          Quagga.ImageDebug.drawPath(box, {
            x: 0,
            y: 1
          }, drawingCtx, {
            color: "green",
            lineWidth: 2
          });
        });
      }

      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, {
          x: 0,
          y: 1
        }, drawingCtx, {
          color: "#00F",
          lineWidth: 2
        });
      }

      if (result.codeResult && result.codeResult.code) {
        Quagga.ImageDebug.drawPath(result.line, {
          x: 'x',
          y: 'y'
        }, drawingCtx, {
          color: 'red',
          lineWidth: 3
        });
      }
    }
  });

  // Once a barcode had been read successfully, stop quagga and 
  // close the modal after a second to let the user notice where 
  // the barcode had actually been found.
  Quagga.onDetected(function (result) {
    if (result.codeResult.code) {
      $('#scanner_input').val(result.codeResult.code);
      barcode = result.codeResult.code;
      Quagga.stop();
      setTimeout(function () {
        $('#livestream_scanner').modal('hide');
      }, 1000);
    }
  });

  // Stop quagga in any case, when the modal is closed
  $('#livestream_scanner').on('hide.bs.modal', function () {
    if (Quagga) {
      Quagga.stop();
    }
  });

  // Call Quagga.decodeSingle() for every file selected in the 
  // file input
  $("#livestream_scanner input:file").on("change", function (e) {
    if (e.target.files && e.target.files.length) {
      Quagga.decodeSingle($.extend({}, fileConfig, {
        src: URL.createObjectURL(e.target.files[0])
      }), function (result) {
        alert(result.codeResult.code);
        $('#livestream_scanner').modal('hide');
      });
    }
  });
});

// Get references to page elements
let newGame = {};

$(document.body).on("click", ".newgame", function () {

  let giantBombURL = $(this).attr("data-api-url");
  $.ajax({
    url: "https://cors-anywhere.herokuapp.com/" + giantBombURL + "?api_key=0f5a567565f80ed0d9a43e0862315a17c315dc22&format=json",
    method: "GET"
  }).then(function (response) {
    console.log(response.results);

    let res = response.results;
    let title = res.name;
    let system_type = res.platforms[0].name; // Restricts platform to first option
    let year_released = res.expected_release_year;
    let api_url = res.api_detail_url;
    let giant_bomb_ID = res.guid;
    let box_art = res.image.medium_url;
    let description = res.deck;
    let is_physical = true;
    let is_beaten = false;

    newGame = {
      title,
      system_type,
      year_released,
      is_physical,
      is_beaten,
      api_url,
      giant_bomb_ID,
      box_art,
      description
    };

    console.log(newGame);

    $.ajax("/api/games", {
      type: "POST",
      data: newGame
    }).then(
      function () {
        console.log("New game sent to database");
      }
    );
  });

})

$("#library-button").on("click", function () {

  $("#database-display").empty();
  $.ajax({
    url: "/api/games",
    type: 'GET',
    success: function (res) {

      for (let i = 0; i < res.length; i++) {
        let p = $("<p>");
        p.attr("data-giant-bomb-id", res[i].giant_bomb_ID);
        p.text(JSON.stringify(res[i], null, 2));
        p.addClass("delete")
        $("#database-display").append(p);
      }
      console.log(res);
    }
  });

  $(document.body).on("click", ".delete", function () {

    let id = $(this).attr("data-giant-bomb-id");
    $.ajax({
      url: "/api/games/" + id,
      type: 'DELETE',
      success: function (res) {
        console.log("Game deleted from database")
        document.getElementById("library-button").click();
      }
    })
  })

});