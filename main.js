"use strict";

let tbody;
let comments = [];
let filtered = [];
let query = null;
let query_raw;
let likes;
let likes_raw;
let picks;
let picks_raw;
let replies;
let replies_raw;
let index = 0;
const count = 25;

function formatDate(date) {
  return date.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
}

function displayTable() {
    const end = Math.min(index + count, filtered.length);
    for (const number of document.getElementsByClassName("number")) {
      number.innerText = index + "-" + end + " / " + filtered.length;
      if (query != null) {
        number.innerText += " matches (" + comments.length + " total)";
      }
    }

    const fragment = document.createDocumentFragment();
    for (const comment of filtered.slice(index, index + count)) {
      const row = document.createElement("tr")
      fragment.appendChild(row);
      const date = new Date(comment["approveDate"] * 1000);
      const time = document.createElement("time");

      // Date
      time.setAttribute("datetime", date.toISOString());
      time.appendChild(document.createTextNode(formatDate(date)));
      row.insertCell().appendChild(time);

      // Body
      row.appendChild(comment["commentBodyCell"]);

      // Article
      const articleLink = document.createElement("a");
      articleLink.href = comment["asset_assetURL"] + "#permid=" + comment["permid"];
      articleLink.appendChild(document.createTextNode(comment["asset_assetTitle"]));
      articleLink.target = "_blank";
      row.insertCell().appendChild(articleLink);

      // Likes
      row.insertCell().appendChild(document.createTextNode(comment["recommendations"]));

      // NYT Picks
      const cell = row.insertCell();
      if (comment["editorsSelection"]) {
        const sprite = document.createElement("p");
        sprite.classList.add("pick");
        cell.appendChild(sprite)
      }

      // Reply count
      row.insertCell().appendChild(document.createTextNode(comment["replyCount"]));
    }
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
    tbody.appendChild(fragment);
}

function updateTotal() {
    let prefix = "";
    if (query) {
        prefix = "for search '" + query_raw + "': ";
    }
    document.getElementById("total").innerText = prefix + filtered.length + " comments, " + likes + " likes, " + picks + " picks, " + replies + " replies";
}

function fetch() {
  const request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    const parsed = JSON.parse(this.responseText);
    comments = filtered = parsed["data"];
    index = 0;
    query = null;
    likes = 0;
    picks = 0;
    replies = 0;
    for (const comment of comments) {
      comment["commentBodyLength"] = comment["commentBody"].length;
      const cell = document.createElement("td");
      cell.innerHTML = comment["commentBody"];
      comment["commentBodyCell"] = cell;
      likes += comment["recommendations"];
      picks += comment["editorsSelection"];
      replies += comment["replyCount"];
    }
    likes_raw = likes;
    picks_raw = picks;
    replies_raw = replies;
    document.getElementById("date").innerText = "Last updated at " + formatDate(new Date(parsed["date"] * 1000)) + ".";
    updateTotal();
    displayTable();
  });
  request.open("GET", "/comments/" + document.getElementById("author").value + ".json");
  request.send();
}

addEventListener('DOMContentLoaded', function() {
  tbody = document.getElementById("comments");

  function sort(key, ascending) {
    const less = ascending ? -1 : 1;

    // maintain an index to perform a stable sort
    for (let i = 0; i < comments.length; i++) {
      comments[i]["index"] = i;
    }

    comments.sort(function(commentA, commentB) {
      const a = commentA[key];
      const b = commentB[key];
      if (a < b) {
        return less;
      }
      if (a > b) {
        return -less;
      }
      if (commentA["index"] < commentB["index"]) {
        return -1;
      }
      if (commentA["index"] > commentB["index"]) {
        return 1;
      }
      return 0;
    });
    doSearch();
    displayTable();
  }

  document.getElementById("descendingDate").addEventListener("click", function() {
    sort("approveDate", false);
  });

  document.getElementById("ascendingDate").addEventListener("click", function() {
    sort("approveDate", true);
  });

  document.getElementById("descendingCommentBody").addEventListener("click", function() {
    sort("commentBodyLength", false);
  });

  document.getElementById("ascendingCommentBody").addEventListener("click", function() {
    sort("commentBodyLength", true);
  });

  document.getElementById("descendingRecommendations").addEventListener("click", function() {
    sort("recommendations", false);
  });

  document.getElementById("ascendingRecommendations").addEventListener("click", function() {
    sort("recommendations", true);
  });

  document.getElementById("descendingEditorsSelection").addEventListener("click", function() {
    sort("editorsSelection", false);
  });

  document.getElementById("ascendingEditorsSelection").addEventListener("click", function() {
    sort("editorsSelection", true);
  });

  document.getElementById("descendingReplyCount").addEventListener("click", function() {
    sort("replyCount", false);
  });

  document.getElementById("ascendingReplyCount").addEventListener("click", function() {
    sort("replyCount", true);
  });

  const author = document.getElementById("author");
  var oldAuthor = localStorage.getItem("author");
  for (const option of author) {
    if (option.value == oldAuthor) {
      author.value = oldAuthor;
      break;
    }
  }

  author.addEventListener("change", function() {
    localStorage.setItem("author", author.value);
    fetch();
  });

  for (const previous of document.getElementsByClassName("previous")) {
    previous.addEventListener("click", function() {
      if (index == 0) {
        return;
      }
      index -= count;
      displayTable();
      scrollTo(0, document.body.scrollHeight);
    });
  }

  for (const next of document.getElementsByClassName("next")) {
    next.addEventListener("click", function() {
      if (index + count > filtered.length) {
        return;
      }
      index += count;
      displayTable();
      scrollTo(0, 0);
    });
  }

  const search = document.getElementById("search");
  function doSearch() {
    if (query != null) {
      filtered = [];
      likes = 0;
      picks = 0;
      replies = 0;
      for (const comment of comments) {
        if (comment["commentBodyCell"].innerText.search(query) != -1) {
          filtered.push(comment);
          likes += comment["recommendations"];
          picks += comment["editorsSelection"];
          replies += comment["replyCount"];
        }
      }
    } else {
      filtered = comments;
      likes = likes_raw;
      picks = picks_raw;
      replies = replies_raw;
    }
    updateTotal();
    displayTable();
  }

  function changeQuery() {
    // https://stackoverflow.com/a/6969486/1009916
    function escapeRegExp(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    if (search.value.length) {
      query = new RegExp(escapeRegExp(search.value), "i");
      query_raw = search.value;
    } else {
      query = null;
      query_raw = search.value;
    }
    index = 0;
    doSearch();
  }

  search.addEventListener("search", changeQuery);
  document.getElementById("searchButton").addEventListener("click", changeQuery);

  fetch();
});
