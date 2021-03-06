'use strict';

/**
 * @ngdoc directive
 * @name ambitIntervalsApp.directive:stepEditor
 * @description
 * # stepEditor
 */
angular.module('ambitIntervalsApp')
  .directive('stepEditor', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        step: '=',
        deleteStep: '=',
        repeatTimes: '=',
        useImperial: '='
      },
      templateUrl: 'views/stepeditortemplate.html',
      link: function ($scope) {
        $scope.stepTypes = ['Other', 'WarmUp', 'Interval', 'Recovery', 'Rest', 'CoolDown'];
        $scope.durationTypes = ['Distance', 'Time', 'Lap', 'Calories', 'HR'];
        $scope.targetTypes = ['Pace', 'Lap Avg Pace', 'Cadence', 'Speed', 'HR', 'HR Zone', 'Lap Avg HR', 'Power', 'None'];
      }
    };
  });
