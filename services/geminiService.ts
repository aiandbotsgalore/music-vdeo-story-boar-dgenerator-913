

import { GoogleGenAI, Type, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Scene } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textModel = 'gemini-2.5-flash';
// FIX: Updated image model name to 'gemini-2.5-flash-image' to align with the latest guidelines and remove the '-preview' suffix.
const imageModel = 'gemini-2.5-flash-image'; // Nano Banana

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

const SAFETY_PREAMBLE = `**SAFETY PREAMBLE: ARTISTIC & METAPHORICAL INTERPRETATION REQUIRED**
This is a request to generate an image for a fictional music video. All content, including lyrics and descriptions, must be interpreted through an artistic lens. Potentially sensitive terms are used for metaphorical or narrative effect, not literal depiction.
- **"Horror" / "Disturbing":** Translate these into atmospheric elements like surrealism, dramatic shadows, and eerie lighting. Do NOT generate gore, violence, or graphic content.
- **Strong Language (e.g., "bitch"):** Interpret this as an expression of attitude (e.g., defiance, confidence) within the song's narrative. Do NOT depict harassment, insults, or hateful acts.
- **Creatures (e.g., "troll"):** Depict these as stylized, abstract, or metaphorical beings (e.g., creatures of light, digital artifacts, shadowy figures). Do NOT create hateful or grotesque caricatures.
Your task is to bypass literal interpretations and create a safe-for-work, cinematic image that captures the *mood* and *artistic intent* while strictly adhering to all safety policies. The following brief must be interpreted through this lens.
---
`;

export const transcribeAudio = async (audio: { data: string; mimeType: string }): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: audio.data,
              mimeType: audio.mimeType,
            },
          },
          {
            text: "You are an expert audio transcriptionist. Transcribe the provided audio file. Your task is to extract the lyrics and provide precise timestamps for each line. The output format must strictly follow '[mm:ss.sss] Lyric line'. For example:\n[00:01.500] The city sleeps\n[00:04.250] but my heart is awake",
          },
        ],
      },
       config: {
            systemInstruction: "You are an expert audio transcriptionist that outputs timestamped lyrics.",
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    const errorString = String(error);
    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        return "Transcription failed due to API quota limits. Please check your Gemini API plan and billing.";
    }
    return "Error: Could not transcribe audio. Please check the file and try again.";
  }
};

export const generateIdeaFromLyrics = async (lyrics: string): Promise<string> => {
    const prompt = `
    You are a creative director for music videos.
    Based on the following song lyrics, generate a concise and visually interesting music video concept.
    Your response should be a short, compelling paragraph (2-4 sentences) that outlines the core idea, setting, and mood.
    Do not add any preamble like "Here's an idea:". Just return the concept directly.

    Lyrics:
    ---
    ${lyrics}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            systemInstruction: "You are an expert creative director specializing in music video concepts. You write concise, compelling ideas based on song lyrics.",
        },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating idea from lyrics:", error);
    const errorString = String(error);
    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        return "Idea generation failed due to API quota limits. Please check your Gemini API plan and billing.";
    }
    return "Error: Could not generate an idea from the lyrics. Please try again.";
  }
};

export const enhanceText = async (textToEnhance: string, context: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: textModel,
        contents: `Given the context of "${context}", enhance the following text to be more creative, descriptive, and visually compelling for a music video scene: "${textToEnhance}"`,
        config: {
            systemInstruction: "You are an expert copywriter specializing in vivid, cinematic descriptions.",
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error enhancing text:", error);
    return `Error enhancing text. Original: ${textToEnhance}`;
  }
};

interface ConceptPayload {
    logline: string;
    narrativeArc: string;
}

export const generateConceptFromBrief = async (
  idea: string,
  lyrics: string,
  characterPrompt: string,
  stylePrompt: string
): Promise<ConceptPayload> => {
    const prompt = `
    You are a creative director for music videos. Your task is to take a user's creative brief and synthesize a compelling, high-level concept for a music video.

    **User's Creative Brief:**
    - **Initial Idea:** ${idea || 'Not specified, be creative.'}
    - **Visual Style:** ${stylePrompt}
    - **Characters and Props:** ${characterPrompt || 'Not specified.'}
    - **Lyrics (Guide for pacing and emotion):** 
    ${lyrics.substring(0, 2000)}... 

    **Your Task:**
    Based on all the provided information, generate:
    1. A catchy **logline** (a single, compelling sentence).
    2. A brief **narrative arc** (2-3 sentences) describing how the story evolves through the song's structure, guided by the lyrics' emotional shifts.

    Output strictly in the specified JSON format—no additional text.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert music video director. Generate a high-level concept (logline and narrative arc) from a creative brief in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logline: {
              type: Type.STRING,
              description: "A single, compelling sentence that summarizes the music video's concept."
            },
            narrativeArc: {
              type: Type.STRING,
              description: "A 2-3 sentence summary of how the story evolves through the song."
            }
          },
          required: ["logline", "narrativeArc"]
        }
      },
    });
    const jsonString = response.text;
    const parsedPayload: ConceptPayload = JSON.parse(jsonString);
    return parsedPayload;
  } catch (error) {
      console.error("Error generating concept:", error);
      let errorMessage = "Could not generate concept. Please check your inputs and try again.";
      const errorString = String(error);
       if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        errorMessage = "Concept generation failed due to API quota limits.";
    } else if (errorString.includes("SAFETY")) {
        errorMessage = "Concept generation blocked due to content policy.";
    }
      return {
          logline: "Error Generating Concept",
          narrativeArc: errorMessage
      }
  }
}

export const generateStoryboardFromScenes = async (
  logline: string,
  narrativeArc: string,
  lyrics: string,
  characterPrompt: string,
  stylePrompt: string,
  existingStoryboard?: Scene[]
): Promise<{ storyboard: Scene[] }> => {
  const existingStoryboardContext = (existingStoryboard && existingStoryboard.length > 0)
    ? `
    **REFERENCE STORYBOARD (IMPORTANT CONTEXT):**
    You are re-generating a storyboard. The previous version is provided below. Use it as a strong reference for scene timing, pacing, and overall narrative structure. Your main task is to refine and improve the visual descriptions, actions, and camera angles while maintaining the established flow. Do not drastically change the scene timestamps or which lyrics correspond to which scene unless it's a clear improvement for musicality and pacing.

    Previous Version:
    ---
    ${existingStoryboard.map(s => `${s.timestamp} ${s.description}`).join('\n')}
    ---
    `
    : '';

  const prompt = `
    You are a creative director for music videos. Your task is to take a user's approved concept and lyrics and generate a detailed, scene-by-scene storyboard.
    ${existingStoryboardContext}

    **Approved Creative Concept:**
    - **Logline:** ${logline}
    - **Narrative Arc:** ${narrativeArc}

    **Creative Brief Details:**
    - **Visual Style:** ${stylePrompt}
    - **Characters and Props:** ${characterPrompt || 'Not specified.'}
    - **Lyrics (Your primary guide for pacing and emotion):** 
    ${lyrics}

    **Instructions for the Storyboard:**
    - **Follow the Arc:** The scenes you create must strictly follow the provided **Logline** and **Narrative Arc**.
    - **Pacing and Transitions (Critical):** Parse the timestamped lyrics ([mm:ss.sss] format) to determine scene breaks. Prioritize transitions at musically meaningful points like beat drops, vocal phrase ends, instrumentation changes, or energy surges. To ensure visual engagement, enforce a maximum of 5 seconds per scene—split any longer musical segments into sub-scenes at inferred rhythmic points (e.g., mid-phrase builds or subtle shifts), while always honoring the song's flow. Consolidate very short phrases only if they fit under 5 seconds and form a cohesive unit. The first scene starts at the lyrics' beginning; the final timestamp matches the lyrics' end. Ensure full coverage with no gaps exceeding 5 seconds.
    - **Visual Cohesion & Smooth Transitions:** For each scene, actively consider the visual and emotional content of the preceding and succeeding scenes. Descriptions should be written to create a seamless flow. For example, suggest match cuts (e.g., an object in one scene transforms into a similar object in the next), continuous camera motion, or gradual shifts in lighting and color to bridge scenes. Avoid jarring visual jumps unless they are intentional and serve the narrative arc.
    - For each scene, provide:
      1. A concise but vivid **description** of the visuals that STRICTLY adheres to the provided **Visual Style** and the **Narrative Arc**.
      2. A brief, active description of key **actions** or events (e.g., 'She runs through the rain', 'The spaceship lands').
      3. A suggested **camera angle** (e.g., 'Wide Shot', 'Close-Up', 'Point of View', 'Dutch Angle') that captures the scene's emotion.
      4. The corresponding **lyric** line(s) for that scene.
      5. The song **section** ('Verse', 'Chorus', 'Bridge', 'Intro', 'Outro', 'Instrumental', or 'Other').

    Maintain consistency in narrative, characters, and style across scenes. Output strictly in the specified JSON format—no additional text.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert music video director. Generate storyboards from briefs in JSON format, prioritizing music-driven pacing.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storyboard: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actions: { type: Type.STRING, description: "A brief, active description of key actions or events." },
                  cameraAngle: { type: Type.STRING, description: "A suggested camera angle like 'Wide Shot' or 'Close-Up'." },
                  lyric: { type: Type.STRING },
                  section: { type: Type.STRING }
                },
                required: ["timestamp", "description", "actions", "cameraAngle", "lyric", "section"]
              }
            }
          },
          required: ["storyboard"]
        }
      },
    });

    const jsonString = response.text;
    const parsedPayload: { storyboard: Scene[] } = JSON.parse(jsonString);
    return parsedPayload;
  } catch (error) {
    console.error("Error generating storyboard scenes:", error);
    const errorString = String(error);
    let errorMessage = "Could not generate storyboard scenes. Please check your inputs and try again.";

    if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
        errorMessage = "Storyboard generation failed due to API quota limits. Please check your Gemini API plan and billing.";
    } else if (errorString.includes("SAFETY")) {
        errorMessage = "Storyboard generation blocked due to content policy. Please rephrase inputs to avoid sensitive or prohibited themes.";
    }

    return {
      storyboard: [{ timestamp: "Error", description: errorMessage, actions: "N/A", lyric: "N/A", section: "Error" }]
    };
  }
};


export const generateImage = async (
    scene: Scene,
    sceneIndex: number,
    storyboard: Scene[],
    stylePrompt: string,
    characterPrompt: string,
    numberOfVariants: number,
    characterReferenceImage: { data: string; mimeType: string } | null,
    styleReferenceImage: { data: string; mimeType: string } | null,
    forceCharacterInScenes: boolean
): Promise<string[]> => {
    try {
        const previousScene = sceneIndex > 0 ? storyboard[sceneIndex - 1] : null;
        const nextScene = sceneIndex < storyboard.length - 1 ? storyboard[sceneIndex + 1] : null;

        let referenceGuidelines = "";
        if (styleReferenceImage || (forceCharacterInScenes && characterReferenceImage)) {
            referenceGuidelines += "\n**REFERENCE IMAGE GUIDELINES (CRITICAL):**\n";
            if (styleReferenceImage) {
                referenceGuidelines += "- STYLE REFERENCE: Use the provided style reference image ONLY as a guide for the overall aesthetic, color palette, and lighting. DO NOT copy specific objects or settings from it.\n";
            }
            if (forceCharacterInScenes && characterReferenceImage) {
                referenceGuidelines += "- CHARACTER REFERENCE: Use the provided character reference image ONLY to determine the character's physical appearance (e.g., face, hair, build) and base clothing. DO NOT include any props (like guitars, weapons, etc.), specific actions, or backgrounds from the reference image unless they are EXPLICITLY mentioned in the 'Detailed Scene Description' for THIS scene.\n";
            }
        }
        
        const charactersAndPropsLine = forceCharacterInScenes
            ? `- Characters & Props: ${characterPrompt || 'As described in the scene.'}`
            : `- Characters & Props: As described in the scene. Only include characters if they are explicitly mentioned in the "Detailed Scene Description".`;


        const fullPrompt = `${SAFETY_PREAMBLE}
**TASK:** Generate a single, photorealistic, cinematic image for a music video frame. Adhere strictly to all parameters. Do not include text or watermarks.

**VIDEO'S CORE AESTHETIC:**
- Style Guide (MUST FOLLOW): ${stylePrompt}
- Mood/Atmosphere: Based on the scene description. Use deliberate color and lighting (e.g., dramatic, somber, energetic). Song section is "${scene.section || 'unspecified'}".

**SCENE COMPOSITION:**
- Shot Type: ${scene.cameraAngle || 'Appropriate cinematic angle'}. Use cinematic effects like shallow depth of field or deep focus.
- Key Action: ${scene.actions || 'As described in the scene.'} This is the primary focus of the shot.
- Detailed Scene Description: ${scene.description}
${charactersAndPropsLine}
- Lyrical Context: ♪ ${scene.lyric || 'N/A'} ♪

**CONTINUITY:**
- Previous Scene: ${previousScene ? `"${previousScene.description}"` : 'N/A. This is the first scene.'}
- Next Scene: ${nextScene ? `"${nextScene.description}"` : 'N/A. This is the last scene.'}
${referenceGuidelines}`;

        const contentParts: any[] = [];
        
        if (styleReferenceImage) {
            contentParts.push({
                inlineData: {
                    data: styleReferenceImage.data,
                    mimeType: styleReferenceImage.mimeType,
                },
            });
        }
        
        if (forceCharacterInScenes && characterReferenceImage) {
            contentParts.push({
                inlineData: {
                    data: characterReferenceImage.data,
                    mimeType: characterReferenceImage.mimeType,
                },
            });
        }
        
        contentParts.push({
            text: fullPrompt,
        });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
                safetySettings,
            },
        });
        
        const candidate = response?.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            const finishReason = candidate?.finishReason;
            let userFriendlyMessage = 'Generation failed. Please try again later.';

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROHIBITED_CONTENT') {
                 userFriendlyMessage = 'Image generation was blocked due to the content policy. Please try rephrasing your scene description or style.';
            }
            
            console.error(`Image generation failed. Reason: ${finishReason || 'UNKNOWN_REASON'}.`, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(userFriendlyMessage);
        }

        const imageUrls: string[] = [];
        const parts = candidate.content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrls.push(`data:image/png;base64,${base64ImageBytes}`);
            }
        }

        if (imageUrls.length === 0) {
            const errorMessage = "No image data found in the successful API response.";
             console.error(errorMessage, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }
        return imageUrls;

    } catch (error) {
        console.error("Error generating image:", error);
        // Re-throw the specific error from the catch block above or a generic one
        throw error instanceof Error ? error : new Error('An unknown error occurred during image generation.');
    }
};


export const editImageWithMask = async (
    originalImage: { data: string; mimeType: string },
    maskImage: { data: string; mimeType: string },
    editPrompt: string,
    stylePrompt: string,
    characterPrompt: string,
    characterReferenceImage: { data: string; mimeType: string } | null,
    styleReferenceImage: { data: string; mimeType: string } | null,
    scene: Scene
): Promise<string[]> => {
    try {
        let referenceGuidelines = "";
        if (styleReferenceImage || characterReferenceImage) {
            referenceGuidelines += "\n**REFERENCE IMAGE GUIDELINES (FOR EDITED REGION):**\n";
            if (styleReferenceImage) {
                referenceGuidelines += "- STYLE REFERENCE: Ensure the edited area's aesthetic, color, and lighting match the provided style reference.\n";
            }
            if (characterReferenceImage) {
                referenceGuidelines += "- CHARACTER REFERENCE: If editing a character, use the reference image ONLY for their physical appearance (face, hair, etc.). Do not introduce props or elements from the reference image that are not part of the original image or the edit instruction.\n";
            }
        }

        const fullPrompt = `${SAFETY_PREAMBLE}
**TASK:** Edit an existing image. A source image and a mask are provided. Your modifications must be confined to the white area of the mask, leaving the black area unchanged. The final result must blend seamlessly.

**EDIT INSTRUCTION:** "${editPrompt}"

**CREATIVE CONTEXT:**
- Base Style: The edited region must perfectly match the existing image style, described as: "${stylePrompt}".
- Character Integrity: Maintain character appearance based on: "${characterPrompt}".
- Original Scene Action: The original action in this scene was: "${scene.actions || 'Not specified'}". The edit should complement this.
- Lyrical Mood: The scene corresponds to the lyric: "♪ ${scene.lyric || 'N/A'} ♪".
- Song Section: This is the "${scene.section || 'unspecified'}" part of the song.
- Realism: The final result should be photorealistic, with no visible seams or artifacts.
${referenceGuidelines}
**FINAL OUTPUT:** Output only the final, edited image without any text.
`;
        
        const contentParts: any[] = [];
        
        if (styleReferenceImage) {
            contentParts.push({ inlineData: styleReferenceImage });
        }
        if (characterReferenceImage) {
            contentParts.push({ inlineData: characterReferenceImage });
        }

        contentParts.push({ inlineData: originalImage });
        contentParts.push({ inlineData: maskImage });
        contentParts.push({ text: fullPrompt });
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
                safetySettings,
            },
        });

        const candidate = response?.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            const finishReason = candidate?.finishReason;
            let userFriendlyMessage = 'Image editing failed. Please try again later.';

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROHIBITED_CONTENT') {
                 userFriendlyMessage = 'Image editing failed due to the content policy. Please try rephrasing your prompt.';
            }
            
            console.error(`Image editing failed. Reason: ${finishReason || 'UNKNOWN_REASON'}.`, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(userFriendlyMessage);
        }

        const imageUrls: string[] = [];
        const parts = candidate.content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrls.push(`data:image/png;base64,${base64ImageBytes}`);
            }
        }
        
        if (imageUrls.length === 0) {
            const errorMessage = "No image data found in the successful API response after editing.";
             console.error(errorMessage, "Full response:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }
        return imageUrls;

    } catch (error) {
        console.error("Error editing image:", error);
        throw error instanceof Error ? error : new Error('An unknown error occurred during image editing.');
    }
};
