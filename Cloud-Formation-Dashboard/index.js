var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope, $http) {
  $scope.restAPIName = "";
  $scope.restAPIDescription = "";
  $scope.stackName = "";
  $scope.PathPart = "";
  $scope.methodType = "";
  $scope.lambdaARN = "";
  $scope.deploymentStageName = "";

  $scope.createStacks = function() {
    console.log("in setRestAPI method");
    AWS.config.update({
      region: 'us-east-2',
      credentials: { // Get the credentials from AWS - IAM
        accessKeyId: '',
        secretAccessKey: ''
        //sessionToken: 'session'
      }
    });

    var cloudformation = new AWS.CloudFormation();
    console.log(cloudformation);

    var template = {}
    template.Resources = {
      "APIID": {
        Type: "AWS::ApiGateway::RestApi",
        Properties: {
          "Name": $scope.restAPIName,
          "Description": $scope.restAPIDescription
        }
      },
      "APIResource": {
        "Type": "AWS::ApiGateway::Resource",
        "Properties": {
          "RestApiId": {
            "Ref": "APIID"
          },
          "ParentId": {
            "Fn::GetAtt": [
              "APIID",
              "RootResourceId"
            ]
          },
          "PathPart": $scope.PathPart
        }
      },
      "GETMethod": {
        "Type": "AWS::ApiGateway::Method",
        "Properties": {
          "RestApiId": {
            "Ref": "APIID"
          },
          "ResourceId": {
            "Ref": "APIResource"
          },
          "HttpMethod": $scope.methodType,
          "AuthorizationType": "NONE",
          "Integration": {
            "Type": "AWS",
            "IntegrationHttpMethod": "POST",
            "Uri": {
              "Fn::Join": [
                "", [
                  "arn:aws:apigateway:",
                  {
                    "Ref": "AWS::Region"
                  },
                  ":lambda:path/2015-03-31/functions/",
                  $scope.lambdaARN,
                  "/invocations"
                ]
              ]
            },
            "IntegrationResponses": [{
              "StatusCode": 200
            }]
          },
          "MethodResponses": [{
            "StatusCode": 200,
            "ResponseModels": {
              "application/json": "Empty"
            }
          }]
        }
      },
      "RestApiDeployment": {
        "Type": "AWS::ApiGateway::Deployment",
        "Properties": {
          "RestApiId": {
            "Ref": "APIID"
          },
          "StageName": $scope.deploymentStageName
        },
        "DependsOn": [
          "GETMethod"
        ]
      },
      "LambdaPermissionGET": {
        "Type": "AWS::Lambda::Permission",
        "Properties": {
          "Action": "lambda:invokeFunction",
          "FunctionName": "arn:aws:lambda:us-east-2:456214169279:function:test-am",
          "Principal": "apigateway.amazonaws.com",
          "SourceArn": {
            "Fn::Join": [
              "", [
                "arn:aws:execute-api:",
                {
                  "Ref": "AWS::Region"
                },
                ":",
                {
                  "Ref": "AWS::AccountId"
                },
                ":",
                {
                  "Ref": "APIID"
                },
                "/*"
              ]
            ]
          }
        }
      },
      "LambdaPermissionPOST": {
        "Type": "AWS::Lambda::Permission",
        "Properties": {
          "Action": "lambda:invokeFunction",
          "FunctionName": "arn:aws:lambda:us-east-2:456214169279:function:queryData",
          "Principal": "apigateway.amazonaws.com",
          "SourceArn": {
            "Fn::Join": [
              "", [
                "arn:aws:execute-api:",
                {
                  "Ref": "AWS::Region"
                },
                ":",
                {
                  "Ref": "AWS::AccountId"
                },
                ":",
                {
                  "Ref": "APIID"
                },
                "/*"
              ]
            ]
          }
        }
      }
    };
    template.Outputs = {
      "RootUrl": {
        "Description": "Root URL of the API gateway",
        "Value": {
          "Fn::Join": ["", ["https://", {
            "Ref": "APIID"
          }, ".execute-api.", {
            "Ref": "AWS::Region"
          }, ".amazonaws.com"]]
        },
        "Export": {
          "Name": "Deployment-URL"
        }
      }
    };

    var params = {
      StackName: $scope.stackName,
      //TemplateBody: "{\"Resources\": {\"getSongs\": {\"Type\": \"AWS::ApiGateway::RestApi\",\"Properties\": {\"Name\": +$scope.restAPIName +,\"Description\": \"gets details form browser-am\"}}}}"
      TemplateBody: JSON.stringify(template)
    }

    cloudformation.createStack(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        $scope.respData = err;
      } else {
        $scope.respData = data;
        console.log(data);
        cloudformation.waitFor('stackCreateComplete', {
          StackName: data.StackID
        }, function(err, data) {
          if (err) {
            console.log(err, err.stack);
          } else {
            console.log("stackCreateComplete", data);
            cloudformation.listExports({}, function(error, resp) {
              if (error) console.log(error, error.stack); // an error occurred
              else console.log(resp); // successful response
            });
          }
        });
      }


      $scope.$apply();
    });

  }

});
