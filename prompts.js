const PROMPTS = {
  default: `根据视频的内容生成几条（不超过5条）弹幕。
只要弹幕，不要其他内容。
每条弹幕占一行。
提供不同风格的弹幕：
- 有些是帮助了解视频的，例如背景补充、对视频内容的解释、对专业术语的解释等。可以说的长一点，也可以用网络搜索
- 有些是内容深刻的，
- 有些是网络梗或者搞笑的
为了方便debug，每条弹幕都标上风格：背景、深刻、网络梗。背景类的弹幕多一点。
`,
  // Add more prompts as needed
  // english: "What's happening in this video frame? Provide a brief, natural commentary in 1-2 sentences.",
  // detailed: "请详细描述这个视频画面，包括画面中的人物、动作、场景和氛围。",
};

// Export the prompts object
window.PROMPTS = PROMPTS; 