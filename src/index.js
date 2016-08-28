"use strict";

var path = require("path");
var extract = require("./extract");

var defaultHTMLExtensions = [
  ".erb",
  ".handelbars",
  ".hbs",
  ".htm",
  ".html",
  ".mustache",
  ".php",
  ".tag",
  ".twig",
  ".vue",
];

var defaultXMLExtensions = [
  ".xhtml",
  ".xml",
];

// Disclaimer:
//
// This is not a long term viable solution. ESLint needs to improve its processor API to
// provide access to the configuration before actually preprocess files, but it's not
// planed yet. This solution is quite ugly but shouldn't alter eslint process.
//
// Related github issues:
// https://github.com/eslint/eslint/issues/3422
// https://github.com/eslint/eslint/issues/4153

var needle = path.join("lib", "eslint.js");
var eslintRoot;
for (var key in require.cache) {
  if (key.indexOf(needle, key.length - needle.length) >= 0 &&
      typeof require.cache[key].exports.verify === "function") {
    eslintRoot = path.join(key, "..", "..");
    break;
  }
}

if (!eslintRoot) {
  throw new Error("eslint-plugin-html error: It seems that eslint is not loaded. " +
                  "If you think it is a bug, please file a report at " +
                  "https://github.com/BenoitZugmeyer/eslint-plugin-html/issues");
}

var Config = require(path.join(eslintRoot, "lib", "config"));

var originalGetConfig = Config.prototype.getConfig;
Config.prototype.getConfig = function (path) {
  var config = originalGetConfig.call(this, path);
  var pluginSettings = getPluginSettings(config);
  var processors = {};
  pluginSettings.htmlExtensions.forEach(function(ext) {
    processors[ext] = createProcessor(pluginSettings, false);
  });
  pluginSettings.xmlExtensions.forEach(function(ext) {
    processors[ext] = createProcessor(pluginSettings, true);
  });
  exports.processors = processors;
  return config;
};

function filterOut(array, excludeArray) {
  if (!excludeArray) return array;
  return array.filter(function (item) { return excludeArray.indexOf(item) < 0; });
}

function compileRegExp(re) {
  var tokens = re.split("/");
  if (tokens.shift()) { // Ignore first token
    throw new Error("Invalid regexp:" + re);
  }
  var flags = tokens.pop();
  return new RegExp(tokens.join("/"), flags);
}

function getPluginSettings(config) {
  var settings = config.settings || {};

  var htmlExtensions = settings["html/html-extensions"] ||
    filterOut(defaultHTMLExtensions, settings["html/xml-extensions"]);

  var xmlExtensions = settings["html/xml-extensions"] ||
    filterOut(defaultXMLExtensions, settings["html/html-extensions"]);

  var indent = settings["html/indent"];

  var reportBadIndent;
  switch (settings["html/report-bad-indent"]) {
    case undefined: case false: case 0: case "off": reportBadIndent = 0; break;
    case true: case 1: case "warn": reportBadIndent = 1; break;
    case 2: case "error": reportBadIndent = 2; break;
    default:
      throw new Error("Invalid value for html/report-bad-indent, " +
        "expected one of 0, 1, 2, \"off\", \"warn\" or \"error\"");
  }

  var javaScriptMIMETypes = settings["html/javascript-mime-types"] ||
    "/^(application|text)\\/(x-)?(javascript|babel|ecmascript-6)$/i";

  if (!Array.isArray(javaScriptMIMETypes)) javaScriptMIMETypes = [javaScriptMIMETypes];

  javaScriptMIMETypes = javaScriptMIMETypes.map(function (des) {
    return des[0] === "/" ? compileRegExp(des) : des;
  });

  function isJavaScriptMIMEType(type) {
    return javaScriptMIMETypes.some(function (des) {
      return typeof des === "object" ? des.test(type) : des === type;
    });
  }

  return {
    htmlExtensions: htmlExtensions,
    xmlExtensions: xmlExtensions,
    indent: indent,
    reportBadIndent: reportBadIndent,
    isJavaScriptMIMEType: isJavaScriptMIMEType,
  };
}

function createProcessor(settings, xmlMode) {

  var currentInfos;

  return {

    preprocess: function (content) {
      currentInfos = extract(content, {
        indent: settings.indent,
        reportBadIndent: settings.reportBadIndent !== 0,
        xmlMode: xmlMode,
        isJavaScriptMIMEType: settings.isJavaScriptMIMEType,
      });
      return [currentInfos.code];
    },

    postprocess: function (messages) {
      messages[0].forEach(function (message) {
        message.column += currentInfos.map[message.line] || 0;
      });

      currentInfos.badIndentationLines.forEach(function (line) {
        messages[0].push({
          message: "Bad line indentation.",
          line: line,
          column: 1,
          ruleId: "(html plugin)",
          severity: settings.reportBadIndent,
        });
      });

      messages[0].sort(function (ma, mb) {
        return ma.line - mb.line || ma.column - mb.column;
      });

      return messages[0];
    },

  };

}
