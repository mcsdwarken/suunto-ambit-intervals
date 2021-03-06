'use strict';

/**
 * @ngdoc service
 * @name ambitIntervalsApp.codeGeneratorService
 * @description
 * # codeGeneratorService
 * Service in the ambitIntervalsApp.
 */
angular.module('ambitIntervalsApp')
  .service('codeGeneratorService', function codeGeneratorService(preprocessor) {
    var createHeader = function (input, appType) {
      var output = '';
      output += '/* ' + appType + ' App */\r\n';
      output += '/* ' + input.name + ' */\r\n';

      if (input.description) {
        output += '/* ' + input.description + ' */\r\n';
      }

      output += '\r\n';
      return output;
    };

    var createVariableInitialization = function (variables) {
      var output = '';
      output += '/* Initialize variables */\r\n';
      output += 'if (SUUNTO_DURATION == 0) {\r\n';
      for (var i = 0; i < variables.length; ++i) {
        output += '  ' + variables[i] + ' = 0;\r\n';
      }
      output += '}\r\n\r\n';
      return output;
    };

    var validateDurationVariables = function(step, message) {
      if (!step.duration.value) {
        throw new Error(message + ' missing for step ' + step.type);
      }
    };

    var createStepBodyForDuration = function (step, interval) {
      var output = '';

      if (step.type === 'WarmUp') {
        output += '  prefix = "wu";\r\n';
      }

      if (step.type === 'CoolDown') {
        output += '  prefix = "cd";\r\n';
      }

      if (step.type === 'Interval') {
        output += '  prefix = "int";\r\n';
      }

      if (step.type === 'Recovery') {
        output += '  prefix = "rec";\r\n';
      }

      if (step.type === 'Rest') {
        output += '  prefix = "rest";\r\n';
      }

      if (step.type === 'Other') {
        output += '  prefix = "othr";\r\n';
      }

      if (step.duration.type === 'Lap') {
        if (interval.defaultDurationType === 'Distance') {
          if (interval.imperial) {
            output += '  postfix = "yd";\r\n';
            output += '  RESULT = SUUNTO_LAP_DISTANCE * 1000 * 1.0936;\r\n';
          } else {
            output += '  postfix = "m";\r\n';
            output += '  RESULT = SUUNTO_LAP_DISTANCE * 1000;\r\n';
          }
        } else if (interval.defaultDurationType === 'Time') {
          output += '  postfix = "s";\r\n';
          output += '  RESULT = SUUNTO_LAP_DURATION;\r\n';
        } else if (interval.defaultDurationType === 'Calories') {
          output += '  postfix = "kc";\r\n';
          output += '  RESULT = SUUNTO_LAP_ENERGY;\r\n';
        } else {
          output += '  postfix = "hr";\r\n';
          output += '  RESULT = SUUNTO_HR;\r\n';
        }
      }

      if (step.duration.type === 'Distance') {
        validateDurationVariables(step, 'Distance');
        if (interval.imperial) {
          output += '  postfix = "yd";\r\n';
          output += '  RESULT = ' + (step.duration.value*1760).toFixed(2) + ' - (SUUNTO_LAP_DISTANCE * 1000 * 1.0936);\r\n';
        } else {
          output += '  postfix = "m";\r\n';
          output += '  RESULT = ' + (step.duration.value*1000) + ' - (SUUNTO_LAP_DISTANCE * 1000);\r\n';
        }
      }

      if (step.duration.type === 'Time') {
        validateDurationVariables(step, 'Time');
        output += '  postfix = "s";\r\n';
        output += '  RESULT = ' + (step.duration.value) + ' - SUUNTO_LAP_DURATION;\r\n';
      }

      if (step.duration.type === 'Calories') {
        validateDurationVariables(step, 'Calories');
        output += '  postfix = "kc";\r\n';
        output += '  RESULT = ' + (step.duration.value) + ' - SUUNTO_LAP_ENERGY;\r\n';
      }

      if (step.duration.type === 'HR') {
        validateDurationVariables(step, 'HR');
        output += '  postfix = "hr";\r\n';
        output += '  RESULT = ' + (step.duration.value) + ' - SUUNTO_HR;\r\n';
      }

      return output;
    };

    var createCadencePostfix = function () {
      var output = '\r\n';
      output += '  /* Check for cycling, mountain biking or indoor cycling */\r\n';
      output += '  if(SUUNTO_ACTIVITY_TYPE == 4 || SUUNTO_ACTIVITY_TYPE == 5 || SUUNTO_ACTIVITY_TYPE == 17) {\r\n';
      output += '    postfix = "rpm";\r\n';
      output += '  } else {\r\n';
      output += '    postfix = "spm";\r\n';
      output += '  }\r\n';
      return output;
    };

    var createStepBodyVariables = function (step, suuntoVariableName, postfix, formatPace) {
      var output = '';
      output += '  ACTUAL = ' + suuntoVariableName + ';\r\n';
      output += '  FROM = ' + step.target.from + ';\r\n';
      output += '  TO = ' + step.target.to + ';\r\n';
      output += '  FORMATPACE = ' + formatPace + ';\r\n';

      if (suuntoVariableName === 'SUUNTO_CADENCE') {
        output += createCadencePostfix();
      } else {
        output += '  postfix = "' + postfix + '";\r\n';
      }
      return output;
    };

    var createNoTargetStepBodyVariables = function (suuntoVariableName, postfix, formatPace) {
      var output = '';
      output += '  ACTUAL = ' + suuntoVariableName + ';\r\n';
      output += '  FROM = ACTUAL;\r\n';
      output += '  TO = ACTUAL;\r\n';
      output += '  FORMATPACE = ' + formatPace + ';\r\n';

      if (suuntoVariableName === 'SUUNTO_CADENCE') {
        output += createCadencePostfix();
      } else {
        output += '  postfix = "' + postfix + '";\r\n';
      }
      return output;
    };

    var validateTargetVariables = function(step, message) {
      if ((step.target.type === 'HR Zone' && !step.target.equals) 
        || ((step.target.type !== 'HR Zone' && (!step.target.to || !step.target.from)))) {
        throw new Error(message + ' missing for step ' + step.type);
      }
    };

    var createStepBodyForTarget = function (step, interval) {
      var output = '';
      var variableName = '';

      if (step.target.type === 'Pace' || step.target.type === 'Lap Avg Pace') {
        validateTargetVariables(step, 'Target pace');
        variableName = (step.target.type === 'Pace') ? 'SUUNTO_PACE' : 'SUUNTO_LAP_PACE';

        if (interval.imperial) {
          output += createStepBodyVariables(step, variableName + ' * 1.609 * 60', '/mi', 1);
        } else {
          output += createStepBodyVariables(step, variableName + ' * 60', '/km', 1);
        }
      }

      if (step.target.type === 'Speed') {
        validateTargetVariables(step, 'Target speed');
        if (interval.imperial) {
          output += createStepBodyVariables(step, 'SUUNTO_SPEED * 0.6214', 'mph', 0);
        } else {
          output += createStepBodyVariables(step, 'SUUNTO_SPEED', 'kmh', 0);
        }
      }

      if (step.target.type === 'HR') {
        validateTargetVariables(step, 'Target heart rate');
        output += createStepBodyVariables(step, 'SUUNTO_HR', 'bpm', 0);
      }

      if (step.target.type === 'Lap Avg HR') {
        validateTargetVariables(step, 'Target heart rate');
        output += createStepBodyVariables(step, 'SUUNTO_LAP_AVG_HR', 'bpm', 0);
      }

      if (step.target.type === 'HR Zone') {
        validateTargetVariables(step, 'Target heart rate zone');
        // if (interval.karvonen) {
        //   step.target.from = '(SUUNTO_USER_MAX_HR - SUUNTO_USER_REST_HR) * 0.' + (4 + step.target.equals) + ' + SUUNTO_USER_REST_HR - 1';
        //   step.target.to = '(SUUNTO_USER_MAX_HR - SUUNTO_USER_REST_HR) * 0.' + (5 + step.target.equals) + ' + SUUNTO_USER_REST_HR + 1';
        // }
        // else {
        //   step.target.from = 'SUUNTO_USER_MAX_HR * 0.' + (4 + step.target.equals) + ' - 1';
        //   step.target.to = 'SUUNTO_USER_MAX_HR 0.' + (5 + step.target.equals) + ' + 1';
        // }
        var actual = interval.karvonen 
          ? '10*(SUUNTO_HR - SUUNTO_USER_REST_HR)/(SUUNTO_USER_MAX_HR  - SUUNTO_USER_REST_HR) - 4'
          : '10*SUUNTO_HR/SUUNTO_USER_MAX_HR+4';
        step.target.from = step.target.equals;
        step.target.to = step.target.equals+1;
        output += createStepBodyVariables(step, actual, '', 0);
      }

      if (step.target.type === 'Power') {
        validateTargetVariables(step, 'Target power');
        output += createStepBodyVariables(step, 'SUUNTO_BIKE_POWER', 'W', 0);
      }

      if (step.target.type === 'Cadence') {
        validateTargetVariables(step, 'Target cadence');
        output += createStepBodyVariables(step, 'SUUNTO_CADENCE', '', 0);
      }

      if (step.target.type === 'None') {
        if (interval.defaultTargetType === 'Pace') {
          if (interval.imperial) {
            output += createNoTargetStepBodyVariables('SUUNTO_PACE * 1.609 * 60', '/mi', 1);
          } else {
            output += createNoTargetStepBodyVariables('SUUNTO_PACE * 60', '/km', 1);
          }
        } else if (interval.defaultTargetType === 'Lap Avg Pace') {
          if (interval.imperial) {
            output += createNoTargetStepBodyVariables('SUUNTO_LAP_PACE * 1.609 * 60', '/mi', 1);
          } else {
            output += createNoTargetStepBodyVariables('SUUNTO_LAP_PACE * 60', '/km', 1);
          }
        } else if (interval.defaultTargetType === 'Speed') {
          if (interval.imperial) {
            output += createNoTargetStepBodyVariables('SUUNTO_SPEED * 0.6214', 'mph', 0);
          } else {
            output += createNoTargetStepBodyVariables('SUUNTO_SPEED', 'kmh', 0);
          }
        } else if (interval.defaultTargetType === 'Lap Avg HR') {
          output += createNoTargetStepBodyVariables('SUUNTO_LAP_AVG_HR', 'bpm', 0);
        } else if (interval.defaultTargetType === 'HR') {
          output += createNoTargetStepBodyVariables('SUUNTO_HR', 'bpm', 0);
        } else if (interval.defaultTargetType === 'Power') {
          output += createNoTargetStepBodyVariables('SUUNTO_BIKE_POWER', 'W', 0);
        } else if (interval.defaultTargetType === 'Cadence') {
          output += createNoTargetStepBodyVariables('SUUNTO_CADENCE', '', 0);
        }
      }

      return output;
    };

    var createStepCommentForDuration = function (lapNumber, step) {
      return '/* Lap ' + lapNumber +' is step type ' + step.type + ' with duration type ' + step.duration.type + ' */\r\n';
    };

    var createStepCommentForTarget = function (lapNumber, step) {
      return '/* Lap ' + lapNumber +' is step type ' + step.type + ' with target type ' + step.target.type + ' */\r\n';
    };

    var createBody = function (input, commentFunction, stepFunction) {
      var output = '';
      var lapNumber = 0;
      for (var i = 0; i < input.steps.length; ++i) {
        lapNumber++;
        var step = input.steps[i];

        if (step.type === 'Repeat') {
          for (var j = 0; j < step.steps.length; ++j) {
            var ifCheck = [];
            var repeatLapNumbers = [];
            var repeatStep = step.steps[j];
            for (var k = 0; k < step.times; ++k) {
              var repeatLapNumber = lapNumber + j + (k * step.steps.length);
              repeatLapNumbers.push(repeatLapNumber);
              ifCheck.push('SUUNTO_LAP_NUMBER == ' + repeatLapNumber);
            }

            output += commentFunction(repeatLapNumbers.join(', '), repeatStep);
            output += 'if (' + ifCheck.join(' || ') + ') {\r\n';
            output += stepFunction(repeatStep, input);
            output += '}\r\n\r\n';
          }
          lapNumber += (step.times * step.steps.length) - 1;
        } else {
          output += commentFunction(lapNumber, step);
          output += 'if (SUUNTO_LAP_NUMBER == ' + lapNumber + ') {\r\n';
          output += stepFunction(step, input);
          output += '}\r\n\r\n';
        }
      }
      return output;
    };

    var createTargetAlarm  = function (ontarget, alarmcount, checkLapDuration) {
      var output = '';
      output += '\r\n';
      output += '    /* Check if we need to alert for out-of-target */\r\n';
      if (checkLapDuration) {
        output += '    if (ONTARGET != ' + ontarget + ' && ALARMCOUNT == 0 && SUUNTO_LAP_DURATION > 30) {\r\n';
      } else {
        output += '    if (ONTARGET != ' + ontarget + ' && ALARMCOUNT == 0) {\r\n';
      }
      output += '      ONTARGET = ' +  ontarget + ';\r\n';
      output += '      ALARMCOUNT = ' + alarmcount + ';\r\n';
      output += '    }\r\n';
      return output;
    };

    this.generateDurationApp = function (interval) {
      var input = JSON.parse(JSON.stringify(interval));
      input = preprocessor.convertPaceToSeconds(input);

      var output = '';

      output += createHeader(input, 'Duration');
      output += createVariableInitialization(['RESULT']);
      output += createBody(input, createStepCommentForDuration, createStepBodyForDuration);

      output += '/* Check if duration is reached */\r\n';
      output += 'if (RESULT < 0) {\r\n';
      output += '  RESULT = 0;\r\n';
      if (input.durationAlarm) {
        output += '  /* Alert that duration is reached */\r\n';
        output += '  Suunto.alarmBeep();\r\n';
        if (input.lightAlarm) {
          output += '  Suunto.light();\r\n';
        }
      }
      output += '}\r\n';

      return output;
    };

    this.generateTargetApp = function (interval) {
      var input = interval;
      input = JSON.parse(JSON.stringify(input));
      input = preprocessor.convertPaceToSeconds(input);

      var output = '';
      var variables = ['ACTUAL', 'TO', 'FROM', 'FORMATPACE', 'TARGET', 'TARGETSEC', 'TARGETMIN', 'RESULT'];

      if (input.targetAlarm) {
        variables.push('ALARMCOUNT');
        variables.push('ONTARGET');
      }

      output += createHeader(input, 'Target');
      output += createVariableInitialization(variables);
      output += createBody(input, createStepCommentForTarget, createStepBodyForTarget);

      output += '/* Set target value */\r\n';
      output += 'if (ACTUAL > TO) {\r\n';
      output += '  TARGET = TO;\r\n';
      output += '} else if (ACTUAL < FROM) {\r\n';
      output += '  TARGET = FROM;\r\n';
      output += '} else {\r\n';
      output += '  TARGET = ACTUAL;\r\n';
      output += '}\r\n\r\n';

      output += '/* Check if result should be formatted as pace and labels reversed */\r\n';
      output += 'if (FORMATPACE == 1) {\r\n';
      output += '  if (ACTUAL > TO) {\r\n';
      output += '    prefix ="^";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(1, 2, true);
      }
      output += '  } else if (ACTUAL < FROM) {\r\n';
      output += '    prefix = "v";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(-1, 3, true);
      }
      output += '  } else {\r\n';
      output += '    prefix = ">";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(0, 0, false);
      }
      output += '  }\r\n\r\n';
      output += '  TARGETSEC = Suunto.mod(TARGET, 60);\r\n';
      output += '  TARGETMIN = (TARGET - TARGETSEC) / 60;\r\n';
      output += '  RESULT = TARGETMIN + TARGETSEC/100;\r\n';
      output += '} else {\r\n';
      output += '  if (ACTUAL > TO) {\r\n';
      output += '    prefix ="v";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(-1, 3, true);
      }
      output += '  } else if (ACTUAL < FROM) {\r\n';
      output += '    prefix = "^";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(1, 2, true);
      }
      output += '  } else {\r\n';
      output += '    prefix = ">";\r\n';
      if (input.targetAlarm) {
        output += createTargetAlarm(0, 0, false);
      }
      output += '  }\r\n\r\n';
      if(interval.useTargetWhenOutOfTarget){
        output += '  RESULT = TARGET;\r\n';
      } else {
        output += '  RESULT = ACTUAL;\r\n';
      }
      output += '}\r\n';

      if (input.targetAlarm) {
        output += '\r\n';
        output += '/* Check if alarm is set */\r\n';
        output += 'if (ALARMCOUNT > 0) {\r\n';
        output += '  ALARMCOUNT = ALARMCOUNT - 1;\r\n';
        output += '  Suunto.alarmBeep();\r\n';
        if (input.lightAlarm) {
          output += '  Suunto.light();\r\n';
        }
        output += '}\r\n';
      }

      return output;
    };
  });
