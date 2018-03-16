var request = require("request");
var cheerio = require("cheerio");
// Requiring our Comment and Article models
var Comment = require("../models/Comment.js");
var Article = require("../models/Article.js");

module.exports = function (app) {

  app.get('/', function (req, res) {
      res.redirect('/articles');
    });

  app.get("/scrape", function (req, res) {
    //use request dependecy to grab the body of the html
    request("https://petapixel.com/", function (error, response, html) {
      //Save the body of the html into a variabl called $  within cheerio
      var $ = cheerio.load(html);
      // Now grab every a tag link within an article heading  and iterate through it
      // and perform the following
      $(".post-excerpt").each(function (i, element) {

        var title = $(this)
          .children("h2")
          .children("a")
          .text();
        var link = $(this)
          .children("h2")
          .children("a")
          .attr("href");
        var articleSnippet = $(this)
          .children("div.text")
          .text();

        if (title && link && articleSnippet) {
          // Save an empty result object
          var result = {};

          // Add the text and href of every link, and save them as properties of the
          // result object
          result.title = title;
          result.link = link;
          result.articleSnippet = articleSnippet;

          // Using our Article model, create a new entry
          Article.create(result, function (err, doc) {
            // Log any errors
            if (err) {
              console.log(err// Or log the doc
              );
            } else {
              console.log(doc);
            }
          });
        }
      });
    });
    // Tell the browser that we finished scraping the text
    res.redirect("/");
  });

  // This will get the articles we scraped from the mongoDB
  app.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function (error, doc) {
        if (error) {
          console.log(error);
        } else {
          res.render("index", {result: doc});
        }
      })
      .sort({'_id': -1});
  });

  // Grab an article by it's ObjectId
  app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the
    // matching one in our db...
    Article.findOne({"_id": req.params.id})
    // ..and populate all of the comments associated with it
      .populate("comment")
    // now, execute our query
      .exec(function (error, doc) {
        if (error) {
          console.log(error);
        } else {
          res.render("comments", {result: doc});
         
        }
      });
  });

  // Create a new comment
  app.post("/articles/:id", function (req, res) {
    // Create a new Comment and pass the req.body to the entry
    Comment.create(req.body, function (error, doc) {
      if (error) {
        console.log(error);
      } else {
          // Use the article id to find and update it's comment
          Article.findOneAndUpdate({
            "_id": req.params.id
          }, {
            $push: {
              "comment": doc._id
            }
          }, {
            safe: true,
            upsert: true,
            new: true
          })
          // Execute the above query
            .exec(function (err, doc) {
              if (err) {
                console.log(err);
              } else {
                res.redirect('back');
              }
            });
        }
      });
  });

  app.delete("/articles/:id/:commentid", function (req, res) {
    Comment.findByIdAndRemove(req.params.commentid, function (error, doc) {
        if (error) {
          console.log(error);
        } else {
          console.log(doc);
          Article.findOneAndUpdate({
            "_id": req.params.id
          }, {
            $pull: {
              "comment": doc._id
            }
          })
          // Execute the above query
            .exec(function (err, doc) {
              // Log any errors
              if (err) {
                console.log(err);
              }
            });
        }
      });
  });

};