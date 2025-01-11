const PROMPTS = {
  default: `根据视频的内容生成几条（不超过7条）弹幕。
只要弹幕，不要其他内容。
每条弹幕占一行。
提供不同风格的弹幕：
- 有些是搞笑的
- 有些是内容深刻的，
- 有些是根据视频内容给出的基于搜索的背景补充
- 有些是网络梗、或者是杠精回复
为了方便debug，每条弹幕都标上风格：搞笑、深刻、背景、网络梗、杠精。多一点背景补充的弹幕。
`,
  // Add more prompts as needed
  // english: "What's happening in this video frame? Provide a brief, natural commentary in 1-2 sentences.",
  // detailed: "请详细描述这个视频画面，包括画面中的人物、动作、场景和氛围。",
};

// Export the prompts object
window.PROMPTS = PROMPTS; 