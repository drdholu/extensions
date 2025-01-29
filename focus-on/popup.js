document.addEventListener('DOMContentLoaded', () => {
  const videoInput = document.getElementById('videoInput');
  const addVideoButton = document.getElementById('addVideo');
  const videoList = document.getElementById('videoList');

  // Load saved videos
  chrome.storage.local.get({videos: []}, (data) => {
      updateVideoList(data.videos);
  });

  // Add video functionality
  addVideoButton.addEventListener('click', async () => {
      const input = videoInput.value.trim();
      if (!input) return;

      const videoId = extractVideoId(input);
      if (!videoId) {
          showError('Invalid YouTube URL or video ID');
          return;
      }

      try {
          const title = await fetchVideoTitle(videoId);
          chrome.storage.local.get({videos: []}, (data) => {
              // Check if video already exists
              if (data.videos.some(v => v.id === videoId)) {
                  showError('Video already in list');
                  return;
              }
              
              const newVideos = [...data.videos, {id: videoId, title}];
              chrome.storage.local.set({videos: newVideos}, () => {
                  videoInput.value = '';
                  updateVideoList(newVideos);
              });
          });
      } catch (error) {
          showError('Failed to fetch video details');
      }
  });

  // Remove video functionality
  videoList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) {
          const videoId = e.target.dataset.id;
          chrome.storage.local.get({videos: []}, (data) => {
              const newVideos = data.videos.filter(v => v.id !== videoId);
              chrome.storage.local.set({videos: newVideos}, () => {
                  updateVideoList(newVideos);
              });
          });
      }
  });

  // Helper functions
  function extractVideoId(input) {
      const patterns = [
          /v=([a-zA-Z0-9_-]{11})/, // Standard URL
          /youtu\.be\/([a-zA-Z0-9_-]{11})/, // Short URL
          /^([a-zA-Z0-9_-]{11})$/ // Direct ID
      ];

      for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match && match[1]) return match[1];
      }
      return null;
  }

  async function fetchVideoTitle(videoId) {
      try {
          const response = await fetch(
              `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
          );
          const data = await response.json();
          return data.title || `Video ${videoId}`;
      } catch (error) {
          return `Video ${videoId}`;
      }
  }

  function updateVideoList(videos) {
      videoList.innerHTML = videos.map(video => `
          <div class="video-item">
              <a href="https://youtube.com/watch?v=${video.id}" 
                 target="_blank"
                 class="video-link">
                  ${video.title}
              </a>
              <button class="remove-btn" data-id="${video.id}">Remove</button>
          </div>
      `).join('');
  }

  function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.style.color = '#dc2626';
    errorEl.style.marginTop = '8px';
    errorEl.style.fontSize = '12px';
    
    document.querySelector('.container').appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 3000);
}
});
  