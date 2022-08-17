// variable telegram
var botToken = "***BOT TOKEN***";
var url = "https://api.telegram.org/bot" + botToken

// permitted ID
var chatId = "***CHAT ID***";

// open Sheet spese shared
var ss = SpreadsheetApp.openById("***SPREADSHEET ID***");

// variables with Sheet's name
var sheetSpese = ss.getSheetByName("spese");
var sheetExtraAccess = ss.getSheetByName("accessi_extra");
var sheetPivotTab = ss.getSheetByName("TabPivot");
var categoriesTab = ss.getSheetByName("categorie");

// categories
var categories = categoriesTab.getRange(1, 1, 1, categoriesTab.getLastColumn()).getValues()[0];
var objCategory = getCategories(categories);

function getCategories(cat) {
  var objCat = {};

  cat.forEach(function(el){
    var num = cat.indexOf(el);
    var rowData = categoriesTab.getRange(2, num+1, categoriesTab.getLastRow(), 1).getValues();
    var dataList = rowData.filter(e => e[0] != "").map(e => e[0]);  // delete empty cells and transform from 2D array to 1D array
    objCat[el] = dataList;
  });

  return objCat;
}

// functions
function getUpdates() {
  var messages = UrlFetchApp.fetch(url + "/getUpdates");  // get info from the bot
  var info = JSON.parse(messages);
  var results = info.result;  // list
  
  results.forEach(checkUser);  // loop that sends singular info to another function
  
  sendGraph();  // send graph to us only at the first of the month

}

function checkUser(data) {
  // get the id of the sender
  var id = data.message.from.id;

  // check if the users are admitted or not
  if (id == chatId) { 

    getInfo(data);

  } else {

    getExtraAccess(data);

  };

}

function getInfo(info) {
  var msgId = info.message.message_id;
  var when = new Date(info.message.date * 1000);
  var dateString = when.getDate() + '/' + (when.getMonth()+1) + '/' + when.getFullYear();
  var who = info.message.from.first_name;
  var text = info.message.text;

  var detailData = text.split("-");

  var cat = defineCategory(detailData[0].trim());  // look for the category of the message without extra white space

  var commaPrice = detailData[1].replace('.',','); // if the price is with the point replace it with comma
  
  sheetSpese.appendRow([msgId, dateString, who, detailData[0].trim(), cat, commaPrice]);

}

function defineCategory(element) {
  
  for(i=0; i<categories.length; i=i+1) {

    if (objCategory[categories[i]].includes(element.toLowerCase()) === true) {
      
      return categories[i];

    };
  };

  return null;
}

function getExtraAccess(info) {

  var msgId = info.message.message_id;
  var isBot = info.message.from.is_bot;
  var when = new Date(info.message.date * 1000);
  var who = info.message.from.first_name + " " + info.message.from.last_name;
  var text = info.message.text;

  // put access denied on the SpreadSheet
  sheetExtraAccess.appendRow([msgId, isBot, when, who, text, info]);

  // send a message of the access denied
  var msgAdvice = info.message.from.username + " mi ha mandato il seguente messaggio: " + text;
  UrlFetchApp.fetch(url + "/sendMessage?chat_id=" + chatId + "&text=" + msgAdvice);
}

function sendGraph() {

  if(new Date().getDate() == 1){  //run only the first day of the month

    sheetSpese.getRange(2, 6, sheetSpese.getLastRow()).setNumberFormat("[$€ ]#,##0.00");  // change format in the table to €
    // get data from the pivot table
    var values = sheetPivotTab.getRange(3, 1, sheetPivotTab.getLastRow()-3, sheetPivotTab.getLastColumn()).getValues();

    //creation of DataTable for last six month
    var dataTableSix = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, "Mese");
    categories.forEach(el => dataTableSix.addColumn(Charts.ColumnType.NUMBER, el));

    //creation of DataTable for all time
    var dataTableAllTime = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, "Mese")
      .addColumn(Charts.ColumnType.NUMBER, "spese");

    // populate DataTables
    values.forEach(e => {
      var month = e[0];
      var money = e[e.length - 1];
      dataTableAllTime.addRow([month, money]);
      if(values.indexOf(e) < 6) {
        e.pop();
        dataTableSix.addRow(e);
      };  // END IF
    });  // END FOR EACH

    // build DataTable
    dataTableSix.build();
    dataTableAllTime.build();

    // create the array with annotation column based on data
    var columnAnnotation = [];
    for(var e=1; e<=sheetPivotTab.getLastColumn()-1; e=e+1) {
      if(e-1 != 0){
        columnAnnotation.push(e-1);
        columnAnnotation.push({sourceColumn: e-1, role: 'annotation'});
      } else {
        columnAnnotation.push(0);
      };
    };

    // create the ViewDefinition object
    var dataViewDefinition = Charts.newDataViewDefinition().setColumns(columnAnnotation).build();

    // create the chart for last six month
    var chartSixMonth = Charts.newColumnChart()
    .setTitle('Spese ultimi 6 mesi')
    .setDimensions(650, 350)
    .setDataTable(dataTableSix)
    .setOption('isStacked', true)
    .setOption('hAxis.direction', -1)
    .setDataViewDefinition(dataViewDefinition)
    .setOption('annotations.highContrast', false)
    .setOption('annotations.textStyle', {fontSize: 9, bold: true})
    .build()
    .getBlob();

    // create the chart for all time
    var chartAllTime = Charts.newLineChart()
    .setTitle('Spese mensili totali')
    .setDimensions(750, 350)
    .setDataTable(dataTableAllTime)
    .setOption('hAxis.direction', -1)
    .setOption('hAxis.slantedText', true)
    .setOption('hAxis.slantedTextAngle', 75)
    .setLegendPosition(Charts.Position.NONE)
    .setPointStyle(Charts.PointStyle.MEDIUM)
    .build()
    .getBlob();

    // create a temporary images in my drive (in bot folder)
    var imgFile1 = DriveApp.getFolderById("***FOLDER ID***").createFile(chartSixMonth.setName('sixMonth.png'));
    imgFile1.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);  // update sharing permissions
    var imgFile2 = DriveApp.getFolderById("***FOLDER ID***").createFile(chartAllTime.setName('allTime.png'));
    imgFile2.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);  // update sharing permissions

    // send the image2 by bot
    UrlFetchApp.fetch(url + "/sendPhoto?chat_id=" + chatId + "&photo=" + imgFile2.getUrl());
    UrlFetchApp.fetch(url + "/sendPhoto?chat_id=" + chatId + "&photo=" + imgFile1.getUrl());

    // delete the temporary image
    imgFile1.setTrashed(true);
    imgFile2.setTrashed(true);

  };

}