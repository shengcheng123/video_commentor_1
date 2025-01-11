const PROMPTS = {
  default: `根据视频的内容生成几条（小于5条）弹幕。
只要弹幕，不要其他内容。
每条弹幕占一行。
有些是搞笑的，有些是内容深刻的，
必要的时候可以去搜索一下`,
  // Add more prompts as needed
  // english: "What's happening in this video frame? Provide a brief, natural commentary in 1-2 sentences.",
  // detailed: "请详细描述这个视频画面，包括画面中的人物、动作、场景和氛围。",
};

// Export the prompts object
window.PROMPTS = PROMPTS; 