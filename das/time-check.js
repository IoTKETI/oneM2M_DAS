
  function convertAsterisk(expression, replecement){
//    console.log('convertAsterisk');
    if(expression.indexOf('*') !== -1){
      return expression.replace('*', replecement);
    }
    return expression;
  }

  function convertAsterisksToRanges(expressions){
//    console.log('convertAsterisksToRanges');
    expressions[0] = convertAsterisk(expressions[0], '0-59');
    expressions[1] = convertAsterisk(expressions[1], '0-59');
    expressions[2] = convertAsterisk(expressions[2], '0-23');
    expressions[3] = convertAsterisk(expressions[3], '1-31');
    expressions[4] = convertAsterisk(expressions[4], '1-12');
    expressions[5] = convertAsterisk(expressions[5], '0-6');
    expressions[6] = convertAsterisk(expressions[6], '2000-9999');
    return expressions;
  }

  function convertExpression(expressions){
    console.log('convertExpression');
//  var expressions = removeSpaces(expression).split(' ');
//    var expressions = expression.split(' ');
//   expressions = appendSeccondExpression(expressions);
//    console.log('1',expressions);
    expressions = convertAsterisksToRanges(expressions);
//    console.log('2',expressions);
    expressions = convertAllRanges(expressions);
//    console.log('3',expressions);
    expressions = convertSteps(expressions);
//    console.log('4',expressions);
    expressions = normalizeIntegers(expressions);
//    console.log('5',expressions);
    return expressions.join(' ');
  }


  function isValidExpression(expression, min, max){
    var options = expression.split(',');
    var regexValidation = /^\d+$|^\*$|^\*\/\d+$/;
    for(var i = 0; i < options.length; i++){
      var option = options[i];
      var optionAsInt = parseInt(options[i], 10);
      if(optionAsInt < min || optionAsInt > max || !regexValidation.test(option)) {
        return false;
      }
    }
    return true;
  }

  function isInvalidSecond(expression){
    return !isValidExpression(expression, 0, 59);
  }

  function isInvalidMinute(expression){
    return !isValidExpression(expression, 0, 59);
  }

  function isInvalidHour(expression){
    return !isValidExpression(expression, 0, 23);
  }

  function isInvalidDayOfMonth(expression){
    return !isValidExpression(expression, 1, 31);
  }

  function isInvalidMonth(expression){
    return !isValidExpression(expression, 1, 12);
  }

  function isInvalidWeekDay(expression){
    return !isValidExpression(expression, 0, 7);
  }

  function isInvalidYear(expression){
    return !isValidExpression(expression, 2000, 9999);
  }

  function validateFields(patterns, executablePatterns){
    if (isInvalidSecond(executablePatterns[0])) {
      throw patterns[0] + ' is a invalid expression for second';
    }

    if (isInvalidMinute(executablePatterns[1])) {
      throw patterns[1] + ' is a invalid expression for minute';
    }

    if (isInvalidHour(executablePatterns[2])) {
      throw patterns[2] + ' is a invalid expression for hour';
    }

    if (isInvalidDayOfMonth(executablePatterns[3])) {
      throw patterns[3] + ' is a invalid expression for day of month';
    }

    if (isInvalidMonth(executablePatterns[4])) {
      throw patterns[4] + ' is a invalid expression for month';
    }

    if (isInvalidWeekDay(executablePatterns[5])) {
      throw patterns[5] + ' is a invalid expression for week day';
    }

    if (isInvalidYear(executablePatterns[6])) {
      throw patterns[6] + ' is a invalid expression for year';
    }
  }
  // Check if the expression is in valid format
  function validate(pattern){
    console.log('validate');
    if (typeof pattern !== 'string'){
      throw 'pattern must be a string!';
    }

    var patterns = pattern.split(' ');
    var executablePattern = convertExpression(patterns);
    var executablePatterns = executablePattern.split(' ');
    validateFields(patterns, executablePatterns);
  }

  // (1) convert steps format
  function convertSteps(expressions){
    var stepValuePattern = /^(.+)\/(\d+)$/;
    for(var i = 0; i < expressions.length; i++){
      var match = stepValuePattern.exec(expressions[i]);
      var isStepValue = match !== null && match.length > 0;
      if(isStepValue){
        var values = match[1].split(',');
        var setpValues = [];
        var divider = parseInt(match[2], 10);
        for(var j = 0; j <= values.length; j++){
          var value = parseInt(values[j], 10);
          if(value % divider === 0){
            setpValues.push(value);
          }
        }
        expressions[i] = setpValues.join(',');
      }
    }
    return expressions;
  }

  // (2) convert range expression
  function replaceWithRange(expression, text, init, end) {

    var numbers = [];
    var last = parseInt(end);
    var first = parseInt(init);

    if(first > last){
      last = parseInt(init);
      first = parseInt(end);
    }

    for(var i = first; i <= last; i++) {
      numbers.push(i);
    }

    return expression.replace(new RegExp(text, 'gi'), numbers.join());
  }

  function convertRange(expression){
    var rangeRegEx = /(\d+)\-(\d+)/;
    var match = rangeRegEx.exec(expression);
    while(match !== null && match.length > 0){
      expression = replaceWithRange(expression, match[0], match[1], match[2]);
      match = rangeRegEx.exec(expression);
    }
    return expression;
  }

  function convertAllRanges(expressions){
    for(var i = 0; i < expressions.length; i++){
      expressions[i] = convertRange(expressions[i]);
    }
    return expressions;
  }

  function removeSpaces(str) {
    console.log('removeSpaces');
    return str.replace(/\s{2,}/g, ' ').trim();
  }

  function normalizeIntegers(expressions) {
    for (var i=0; i < expressions.length; i++){
      var numbers = expressions[i].split(',');
      for (var j=0; j<numbers.length; j++){
        numbers[j] = parseInt(numbers[j]);
      }
      expressions[i] = numbers;
    }
    return expressions;
  }

exports.validate_expression = function (expression) {
    try {
      validate(expression);
    } catch(e) {
      return false;
    }
    return true;
  }

function matchPattern(pattern, value){

  if( pattern.indexOf(',') !== -1 ){
    var patterns = pattern.split(',');
//    console.log(patterns);
//    console.log(value.toString());
//    console.log(patterns.indexOf(value.toString()));

    return patterns.indexOf(value.toString()) !== -1;
  }
  return pattern === value.toString();
}

exports.req_time_validation = function( pattern, date){
//  console.log(typeof(date));
  var patterns = pattern.split(' ');
  var executablePattern = convertExpression(patterns);
  var executablePatterns = executablePattern.split(' ');

//  console.log(executablePatterns);
  console.log('second:',date.getSeconds());
  console.log('Minutes:',date.getMinutes());
  console.log('Hours:',date.getHours());
  console.log('DayOfMonth:',date.getDate());
  console.log('Month:',date.getMonth()+1);
  console.log('DayOfWeek:',date.getDay());
  console.log('Year:',date.getFullYear());

  var runInSecond = matchPattern(executablePatterns[0], date.getSeconds());
  var runOnMinute = matchPattern(executablePatterns[1], date.getMinutes());
  var runOnHour = matchPattern(executablePatterns[2], date.getHours());
  var runOnDayOfMonth = matchPattern(executablePatterns[3], date.getDate());
  var runOnMonth = matchPattern(executablePatterns[4], date.getMonth() + 1);
  var runOnDayOfWeek = matchPattern(executablePatterns[5], date.getDay());
  var runOnYear = matchPattern(executablePatterns[6], date.getFullYear());

/*
  var runOnDay = false;
  var delta = task.initialPattern.length === 6 ? 0 : -1;
  
  if (task.initialPattern[3 + delta] === '*') {
    runOnDay = runOnDayOfWeek;
  } else if (task.initialPattern[5 + delta] === '*') {
    runOnDay = runOnDayOfMonth;
  } else {
    runOnDay = runOnDayOfMonth || runOnDayOfWeek;
  }
  
  return runInSecond && runOnMinute && runOnHour && runOnDay && runOnMonth;
*/
  return runInSecond && runOnMinute && runOnHour && runOnDayOfMonth && runOnMonth && runOnDayOfWeek && runOnYear;

}
