var assert = require("assert");
var path = require("path");
var CLIEngine = require("eslint").CLIEngine;
var plugin = require("..");

function execute(file, baseConfig) {
  if (!baseConfig) baseConfig = {};

  var cli = new CLIEngine({
    extensions: ["html"],
    baseConfig: {
      settings: baseConfig.settings,
      rules: Object.assign({
        "no-console": 2,
      }, baseConfig.rules),
    },
    ignore: false,
    useEslintrc: false,
  });
  cli.addPlugin("html", plugin);
  var results = cli.executeOnFiles([path.join(__dirname, "fixtures", file)]).results;
  return results[0] && results[0].messages;
}



describe("plugin", function () {

  it("should extract and remap messages", function () {
    var messages = execute("simple.html");

    assert.equal(messages.length, 5);

    assert.equal(messages[0].message, "Unexpected console statement.");
    assert.equal(messages[0].line, 8);
    assert.equal(messages[0].column, 7);

    assert.equal(messages[1].message, "Unexpected console statement.");
    assert.equal(messages[1].line, 14);
    assert.equal(messages[1].column, 7);

    assert.equal(messages[2].message, "Unexpected console statement.");
    assert.equal(messages[2].line, 20);
    assert.equal(messages[2].column, 3);

    assert.equal(messages[3].message, "Unexpected console statement.");
    assert.equal(messages[3].line, 25);
    assert.equal(messages[3].column, 11);

    assert.equal(messages[4].message, "Unexpected console statement.");
    assert.equal(messages[4].line, 28);
    assert.equal(messages[4].column, 13);
  });

  it("should report correct line numbers with crlf newlines", function () {
    var messages = execute("crlf-newlines.html");

    assert.equal(messages.length, 1);

    assert.equal(messages[0].message, "Unexpected console statement.");
    assert.equal(messages[0].line, 8);
    assert.equal(messages[0].column, 7);
  });

  it("should work correctly with the 'no-multiple-empty-lines' rule", function () {
    var messages = execute("simple.html", {
      rules: {
        "no-multiple-empty-lines": 2,
        "no-console": 0,
      }
    });

    assert.equal(messages.length, 0);
  });

  describe("html/indent setting", function () {
    it("should automatically compute indent when nothing is specified", function () {
      var messages = execute("indent-setting.html", {
        rules: {
          indent: [2, 2],
        },
      });

      assert.equal(messages.length, 0);
    });

    it("should work with a zero absolute indentation descriptor", function () {
      var messages = execute("indent-setting.html", {
        rules: {
          indent: [2, 2],
        },

        settings: {
          "html/indent": 0,
        },
      });

      assert.equal(messages.length, 3);

      // Only the first script is correctly indented (aligned on the first column)

      assert.equal(messages[0].message, "Expected indentation of 0 space characters but found 2.");
      assert.equal(messages[0].line, 16);

      assert.equal(messages[1].message, "Expected indentation of 0 space characters but found 6.");
      assert.equal(messages[1].line, 22);

      assert.equal(messages[2].message, "Expected indentation of 0 space characters but found 10.");
      assert.equal(messages[2].line, 28);
    });

    it("should work with a non-zero absolute indentation descriptor", function () {
      var messages = execute("indent-setting.html", {
        rules: {
          indent: [2, 2],
        },

        settings: {
          "html/indent": 2,
        },
      });

      assert.equal(messages.length, 7);

      // The first script is incorrect since the second line gets dedented
      assert.equal(messages[0].message, "Expected indentation of 2 space characters but found 0.");
      assert.equal(messages[0].line, 11);

      // The second script is correct.

      assert.equal(messages[1].message, "Expected indentation of 0 space characters but found 6.");
      assert.equal(messages[1].line, 22);

      assert.equal(messages[2].message, "Expected indentation of 8 space characters but found 6.");
      assert.equal(messages[2].line, 23);

      assert.equal(messages[3].message, "Expected indentation of 6 space characters but found 4.");
      assert.equal(messages[3].line, 24);


      assert.equal(messages[4].message, "Expected indentation of 0 space characters but found 10.");
      assert.equal(messages[4].line, 28);

      assert.equal(messages[5].message, "Expected indentation of 12 space characters but found 10.");
      assert.equal(messages[5].line, 29);

      assert.equal(messages[6].message, "Expected indentation of 10 space characters but found 8.");
      assert.equal(messages[6].line, 30);
    });

    it("should work with relative indentation descriptor", function () {
      var messages = execute("indent-setting.html", {
        rules: {
          indent: [2, 2],
        },

        settings: {
          "html/indent": "+2",
        },
      });

      assert.equal(messages.length, 4);

      // The first script is correct since it can't be dedented, but follows the indent
      // rule anyway.

      assert.equal(messages[0].message, "Expected indentation of 0 space characters but found 2.");
      assert.equal(messages[0].line, 16);

      // The third script is correct.

      assert.equal(messages[1].message, "Expected indentation of 0 space characters but found 10.");
      assert.equal(messages[1].line, 28);

      assert.equal(messages[2].message, "Expected indentation of 12 space characters but found 4.");
      assert.equal(messages[2].line, 29);

      assert.equal(messages[3].message, "Expected indentation of 10 space characters but found 2.");
      assert.equal(messages[3].line, 30);
    });
  });

  describe("html/report-bad-indent setting", function () {
    it("should report under-indented code with auto indent setting", function () {
      var messages = execute("report-bad-indent-setting.html", {
        settings: {
          "html/report-bad-indent": true,
        },
      });

      assert.equal(messages.length, 1);

      assert.equal(messages[0].message, "Bad line indentation.");
      assert.equal(messages[0].line, 10);
      assert.equal(messages[0].column, 1);
    });

    it("should report under-indented code with provided indent setting", function () {
      var messages = execute("report-bad-indent-setting.html", {
        settings: {
          "html/report-bad-indent": true,
          "html/indent": "+4",
        },
      });

      assert.equal(messages.length, 3);

      assert.equal(messages[0].message, "Bad line indentation.");
      assert.equal(messages[0].line, 9);
      assert.equal(messages[0].column, 1);

      assert.equal(messages[1].message, "Bad line indentation.");
      assert.equal(messages[1].line, 10);
      assert.equal(messages[1].column, 1);

      assert.equal(messages[2].message, "Bad line indentation.");
      assert.equal(messages[2].line, 11);
      assert.equal(messages[2].column, 1);
    });
  });

  describe("html/javascript-mime-types", () => {
    it("ignores unknown mime types by default", () => {
      var messages = execute("javascript-mime-types.html");

      assert.equal(messages.length, 2);

      assert.equal(messages[0].ruleId, "no-console");
      assert.equal(messages[0].line, 8);

      assert.equal(messages[1].ruleId, "no-console");
      assert.equal(messages[1].line, 12);
    });

    it("specifies a list of valid mime types", () => {
      var messages = execute("javascript-mime-types.html", {
        settings: {
          "html/javascript-mime-types": ["text/foo"]
        }
      });

      assert.equal(messages.length, 2);

      assert.equal(messages[0].ruleId, "no-console");
      assert.equal(messages[0].line, 8);

      assert.equal(messages[1].ruleId, "no-console");
      assert.equal(messages[1].line, 16);
    });

    it("specifies a regexp of valid mime types", () => {
      var messages = execute("javascript-mime-types.html", {
        settings: {
          "html/javascript-mime-types": "/^(application|text)\/foo$/"
        }
      });

      assert.equal(messages.length, 3);

      assert.equal(messages[0].ruleId, "no-console");
      assert.equal(messages[0].line, 8);

      assert.equal(messages[1].ruleId, "no-console");
      assert.equal(messages[1].line, 16);

      assert.equal(messages[2].ruleId, "no-console");
      assert.equal(messages[2].line, 20);
    });
  });

  describe("xml support", () => {
    it("consider .html files as HTML", () => {
      var messages = execute("cdata.html");

      assert.equal(messages.length, 1);

      assert.equal(messages[0].message, "Parsing error: Unexpected token <");
      assert.equal(messages[0].fatal, true);
      assert.equal(messages[0].line, 10);
      assert.equal(messages[0].column, 7);
    });

    it("can be forced to consider .html files as XML", () => {
      var messages = execute("cdata.html", {
        settings: {
          "html/xml-extensions": [".html"],
        }
      });

      assert.equal(messages.length, 1);

      assert.equal(messages[0].message, "Unexpected console statement.");
      assert.equal(messages[0].line, 11);
      assert.equal(messages[0].column, 9);
    });

    it("consider .xhtml files as XML", () => {
      var messages = execute("cdata.xhtml");

      assert.equal(messages.length, 1);

      assert.equal(messages[0].message, "Unexpected console statement.");
      assert.equal(messages[0].line, 13);
      assert.equal(messages[0].column, 9);
    });

    it("can be forced to consider .xhtml files as HTML", () => {
      var messages = execute("cdata.xhtml", {
        settings: {
          "html/html-extensions": [".xhtml"],
        }
      });

      assert.equal(messages.length, 1);

      assert.equal(messages[0].message, "Parsing error: Unexpected token <");
      assert.equal(messages[0].fatal, true);
      assert.equal(messages[0].line, 12);
      assert.equal(messages[0].column, 7);
    });
  });

});
