// static/js/votes.js
//
// Front-end glue for the upvote / downvote buttons on the post detail
// page. Sends the click as a JSON POST to /posts/:id/vote and then
// re-renders the score and active-button state from the server's reply.
//
// This matches the Sprint 2 voting sequence diagram: User clicks ->
// frontend POST -> backend updates votes/users tables -> frontend
// updates the UI from the response.
//
// If the user is not logged in, the server returns 401 and we redirect
// them to /login so they can come back and try again.

(function () {
  "use strict";

  document.addEventListener("click", async function (event) {
    const btn = event.target.closest(".vote-btn");
    if (!btn) return;

    const wrapper = btn.closest("[data-post-id]");
    if (!wrapper) return;

    const postId = wrapper.dataset.postId;
    const value = parseInt(btn.dataset.vote, 10); // +1 or -1

    btn.disabled = true; // prevent double clicks while in flight
    try {
      const res = await fetch(`/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: value }),
      });

      if (res.status === 401) {
        // Not logged in. Send them to login and bring them back here.
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not register your vote.");
        return;
      }

      // Update the score and the active button highlighting.
      const scoreEl = wrapper.querySelector(`#score-${postId}`);
      if (scoreEl) scoreEl.textContent = data.score;

      const upBtn = wrapper.querySelector(".vote-up");
      const downBtn = wrapper.querySelector(".vote-down");
      if (upBtn) upBtn.classList.toggle("is-active", data.myVote === 1);
      if (downBtn) downBtn.classList.toggle("is-active", data.myVote === -1);
    } catch (err) {
      console.error(err);
      alert("Network error while voting. Please try again.");
    } finally {
      btn.disabled = false;
    }
  });
})();
