document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to avoid HTML injection
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (s) => {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
  }

  // Small initials generator for avatars (based on local-part of email)
  function getInitials(email) {
    const local = String(email).split("@")[0] || "";
    const parts = local.split(/[\.\-_]+/).filter(Boolean);
    const initials = parts.length ? (parts[0][0] || "") + (parts[1] ? parts[1][0] : "") : (local[0] || "");
    return initials.toUpperCase().slice(0, 2);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and dropdown
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants section (with avatars and delete buttons)
        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p class="availability ${spotsLeft === 0 ? "full" : ""}"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsTitle = document.createElement("strong");
        participantsTitle.textContent = `Participants (${details.participants.length}):`;
        participantsSection.appendChild(participantsTitle);

        if (details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants
            .slice()
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
            .forEach(p => {
              const li = document.createElement("li");

              const avatar = document.createElement("span");
              avatar.className = "avatar";
              avatar.textContent = getInitials(p);

              const emailSpan = document.createElement("span");
              emailSpan.className = "participant-email";
              emailSpan.textContent = p;

              const deleteBtn = document.createElement("button");
              deleteBtn.className = "delete-btn";
              deleteBtn.title = "Unregister";
              deleteBtn.textContent = "🗑️";

              deleteBtn.addEventListener("click", async () => {
                try {
                  const response = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`, { method: "DELETE" });
                  const result = await response.json();
                  if (response.ok) {
                    messageDiv.textContent = result.message;
                    messageDiv.className = "success";
                    messageDiv.classList.remove("hidden");
                    fetchActivities();
                  } else {
                    messageDiv.textContent = result.detail || "An error occurred";
                    messageDiv.className = "error";
                    messageDiv.classList.remove("hidden");
                  }
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                } catch (error) {
                  messageDiv.textContent = "Failed to unregister. Please try again.";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  console.error("Error unregistering:", error);
                }
              });

              li.appendChild(avatar);
              li.appendChild(emailSpan);
              li.appendChild(deleteBtn);
              ul.appendChild(li);
            });

          participantsSection.appendChild(ul);
        } else {
          const pNo = document.createElement("p");
          pNo.className = "no-participants";
          pNo.textContent = "No participants yet";
          participantsSection.appendChild(pNo);
        }

        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh the activities list so the new participant appears without a page reload
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
