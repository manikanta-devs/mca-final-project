# LivePortrait + Wav2Lip: 100% Free Video Generation Guide

This guide walks you through generating natural-looking recruiter video clips (`.mp4`) using the open-source **LivePortrait** and **Wav2Lip** hybrid pipeline. This ensures your avatars have realistic blinking, head nodding, and shoulder movements, with lips perfectly synced to generated audio.

---

## 🚀 Step 1: Open the Colab Notebook
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **Upload** and upload the [LivePortrait_Colab_Free.ipynb](file:///c:/anime/ai-interview-system/LivePortrait_Colab_Free.ipynb) notebook from your project root.
3. Set the runtime environment to T4 GPU (`Runtime > Change runtime type > T4 GPU`).

---

## 📝 Step 2: Install Environments
1. Run **Step 1** cell in the notebook to clone the KwaiVGI/LivePortrait repository and download pre-trained weights.
2. Run **Step 2** cell to set up the Wav2Lip environment and download the GAN checkpoint.

---

## 🎙️ Step 3: Run Batch Generation
1. Upload your static recruiter headshot (e.g. `sarah_chen.png`) to the `/content/` directory in the Colab files explorer.
2. Upload your pre-recorded question audio track (e.g., generated with a free TTS like Piper or ElevenLabs free tier) to `/content/`.
3. Update the file paths in the **Step 3** script cell:
   ```python
   portrait_path = "/content/sarah_chen.png"
   audio_path = "/content/hello.wav"
   ```
4. Run the cell. LivePortrait will first animate the headshot using natural breathing/blinking movements, and Wav2Lip will then sync the lips.
5. Download `/content/final_talking_recruiter.mp4` when finished.

---

## 📁 Step 4: Add Videos to Project
1. Rename the downloaded video clip matching the backend-routed file names:
   * `hello_good_morning.mp4`
   * `looking_resume.mp4`
   * `wonderful_thanks_for_joining.mp4`
   * `explaining.mp4`
   * `talking.mp4`
   * `understood.mp4`
2. Place the video files in the recruiter folder matching the selected avatar gender:
   * **Female HR (Sarah Chen):** `c:\anime\ai-interview-system\frontend\public\interviewers\female_hr\`
   * **Male HR (Marcus Rodriguez):** `c:\anime\ai-interview-system\frontend\public\interviewers\male_hr\`
3. Start the app, open the Room Settings modal, and toggle **"Enable Recruiter Video"** on to enjoy high-fidelity, synchronized video feedback!
