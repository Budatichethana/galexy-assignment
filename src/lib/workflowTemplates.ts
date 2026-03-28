export type Template = {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
};

export const WORKFLOW_TEMPLATES: Template[] = [
  {
    id: "image-to-llm",
    name: "Image -> LLM",
    nodes: [
      {
        id: "1",
        type: "image",
        position: { x: 120, y: 140 },
        data: { label: "Input Image", status: "idle" },
      },
      {
        id: "2",
        type: "llm",
        position: { x: 520, y: 140 },
        data: {
          label: "Describe Image",
          status: "idle",
          systemPrompt: "You are an expert visual analyst.",
          userMessage: "Describe this image with key objects and context.",
        },
      },
    ],
    edges: [{ id: "e1-2", source: "1", target: "2", animated: true }],
  },
  {
    id: "text-to-llm",
    name: "Text -> LLM",
    nodes: [
      {
        id: "1",
        type: "text",
        position: { x: 120, y: 140 },
        data: {
          label: "Input Text",
          status: "idle",
          manualInput: "Paste your text here",
        },
      },
      {
        id: "2",
        type: "llm",
        position: { x: 520, y: 140 },
        data: {
          label: "Rewrite",
          status: "idle",
          systemPrompt: "You rewrite text for clarity and brevity.",
          userMessage: "Rewrite this in a concise professional style.",
        },
      },
    ],
    edges: [{ id: "e1-2", source: "1", target: "2", animated: true }],
  },
  {
    id: "video-frame-llm",
    name: "Video -> Frame -> LLM",
    nodes: [
      {
        id: "1",
        type: "video",
        position: { x: 80, y: 180 },
        data: { label: "Input Video", status: "idle" },
      },
      {
        id: "2",
        type: "frame",
        position: { x: 420, y: 180 },
        data: { label: "Extract Frame", status: "idle", manualInput: "120" },
      },
      {
        id: "3",
        type: "llm",
        position: { x: 760, y: 180 },
        data: {
          label: "Scene Summary",
          status: "idle",
          userMessage: "Summarize the scene in one paragraph.",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3", animated: true },
    ],
  },
  {
    id: "image-crop-llm",
    name: "Image -> Crop -> LLM",
    nodes: [
      {
        id: "1",
        type: "image",
        position: { x: 80, y: 180 },
        data: { label: "Input Image", status: "idle" },
      },
      {
        id: "2",
        type: "crop",
        position: { x: 420, y: 180 },
        data: { label: "Crop Region", status: "idle", manualInput: "x=20,y=20,w=360,h=220" },
      },
      {
        id: "3",
        type: "llm",
        position: { x: 760, y: 180 },
        data: {
          label: "Analyze Cropped Region",
          status: "idle",
          userMessage: "What do you see in this cropped image?",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3", animated: true },
    ],
  },
  {
    id: "text-image-to-llm",
    name: "Text + Image -> LLM",
    nodes: [
      {
        id: "1",
        type: "text",
        position: { x: 90, y: 90 },
        data: {
          label: "Question",
          status: "idle",
          manualInput: "What is happening in this image?",
        },
      },
      {
        id: "2",
        type: "image",
        position: { x: 90, y: 280 },
        data: { label: "Reference Image", status: "idle" },
      },
      {
        id: "3",
        type: "llm",
        position: { x: 520, y: 190 },
        data: {
          label: "Multimodal Response",
          status: "idle",
          systemPrompt: "Answer grounded in both text and image inputs.",
        },
      },
    ],
    edges: [
      { id: "e1-3", source: "1", target: "3", animated: true },
      { id: "e2-3", source: "2", target: "3", animated: true },
    ],
  },
  {
    id: "video-frame-text-to-llm",
    name: "Video -> Frame + Text -> LLM",
    nodes: [
      {
        id: "1",
        type: "video",
        position: { x: 80, y: 100 },
        data: { label: "Input Video", status: "idle" },
      },
      {
        id: "2",
        type: "frame",
        position: { x: 390, y: 100 },
        data: { label: "Pick Key Frame", status: "idle", manualInput: "45" },
      },
      {
        id: "3",
        type: "text",
        position: { x: 390, y: 290 },
        data: {
          label: "Instruction",
          status: "idle",
          manualInput: "Explain what is happening and suggest next action.",
        },
      },
      {
        id: "4",
        type: "llm",
        position: { x: 760, y: 190 },
        data: { label: "Decision Assistant", status: "idle" },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-4", source: "2", target: "4", animated: true },
      { id: "e3-4", source: "3", target: "4", animated: true },
    ],
  },
  {
    id: "product-marketing-kit",
    name: "Product Marketing Kit Generator",
    nodes: [
      // Branch A: Image processing pipeline
      {
        id: "1",
        type: "text",
        position: { x: 80, y: 80 },
        data: {
          label: "System Prompt (Image Context)",
          status: "idle",
          manualInput: "You are a product marketing expert. Analyze product visuals and describe them for marketing.",
        },
      },
      {
        id: "2",
        type: "text",
        position: { x: 80, y: 200 },
        data: {
          label: "Product Details",
          status: "idle",
          manualInput: "Product Name: [NAME]\nKey Features: [FEATURES]\nTarget Audience: [AUDIENCE]",
        },
      },
      {
        id: "3",
        type: "image",
        position: { x: 80, y: 320 },
        data: { label: "Upload Product Image", status: "idle" },
      },
      {
        id: "4",
        type: "crop",
        position: { x: 380, y: 320 },
        data: {
          label: "Crop to Key Features",
          status: "idle",
          manualInput: "x=100,y=100,w=400,h=300",
        },
      },
      {
        id: "5",
        type: "llm",
        position: { x: 680, y: 200 },
        data: {
          label: "LLM #1: Product Description",
          status: "idle",
          systemPrompt: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
          userMessage: "Use the product details and image to generate a marketing description.",
        },
      },
      // Branch B: Video processing pipeline
      {
        id: "6",
        type: "video",
        position: { x: 80, y: 500 },
        data: { label: "Upload Product Video", status: "idle" },
      },
      {
        id: "7",
        type: "frame",
        position: { x: 380, y: 500 },
        data: {
          label: "Extract Key Frame",
          status: "idle",
          manualInput: "120",
        },
      },
      // Final Merge: Text Node #3 (system prompt for final LLM)
      {
        id: "8",
        type: "text",
        position: { x: 680, y: 440 },
        data: {
          label: "Final System Prompt",
          status: "idle",
          manualInput: "You are a social media manager. Create a unified marketing kit by synthesizing all inputs.",
        },
      },
      // Final Merge: LLM Node #2 (depends on LLM #1, Extract Frame, and Final System Prompt)
      {
        id: "9",
        type: "llm",
        position: { x: 1000, y: 350 },
        data: {
          label: "LLM #2: Final Marketing Kit",
          status: "idle",
          userMessage: "Create a comprehensive marketing kit with copy, visuals descriptions, and social media posts.",
        },
      },
    ],
    edges: [
      // Branch A connections: Text nodes + Image pipeline → LLM #1
      {
        id: "e1-5",
        source: "1",
        target: "5",
        sourceHandle: "output",
        targetHandle: "system_prompt",
        animated: true,
      },
      {
        id: "e2-5",
        source: "2",
        target: "5",
        sourceHandle: "output",
        targetHandle: "user_message",
        animated: true,
      },
      // Image pipeline: Upload → Crop → LLM #1
      {
        id: "e3-4",
        source: "3",
        target: "4",
        sourceHandle: "output",
        targetHandle: "images",
        animated: true,
      },
      {
        id: "e4-5",
        source: "4",
        target: "5",
        sourceHandle: "output",
        targetHandle: "images",
        animated: true,
      },
      // LLM #1 output → LLM #2
      {
        id: "e5-9",
        source: "5",
        target: "9",
        sourceHandle: "output",
        targetHandle: "user_message",
        animated: true,
      },
      // Branch B connections: Video pipeline → LLM #2
      {
        id: "e6-7",
        source: "6",
        target: "7",
        sourceHandle: "output",
        targetHandle: "video",
        animated: true,
      },
      {
        id: "e7-9",
        source: "7",
        target: "9",
        sourceHandle: "output",
        targetHandle: "images",
        animated: true,
      },
      // Final System Prompt → LLM #2
      {
        id: "e8-9",
        source: "8",
        target: "9",
        sourceHandle: "output",
        targetHandle: "system_prompt",
        animated: true,
      },
    ],
  },
];

export function getWorkflowTemplateById(templateId: string): Template | undefined {
  return WORKFLOW_TEMPLATES.find((template) => template.id === templateId);
}
