import { ChatMessageRoleEnum, MentalProcess, WorkingMemory, indentNicely, useActions, useProcessManager, usePerceptions } from "@opensouls/engine";
import decision from "./lib/decision.js";
import externalDialog from "./lib/externalDialog.js";
import internalMonologue from "./lib/internalMonologue.js";
import mentalQuery from "./lib/mentalQuery.js";
import outraged from "./mentalProcesses/outraged.js";

const initialProcess: MentalProcess = async ({ workingMemory }) => {
  const { speak, log, dispatch } = useActions();
  const { setNextProcess } = useProcessManager();

  let memory = workingMemory;
  let stream;

  const [travel, info, question, chat, rude] = [
    "They explicitly asked Kathor about travel destinations",
    "They provided information that Kathor requested to start building an itinerary",
    "They asked a new question about the itinerary",
    "They're continuing the conversation or just chit-chatting",
    "They're being rude or impolite to Kathor"
  ];
  const [, intent] = await decision(
    memory,
    {
      description: "What is the intent of the user with their latest message?",
      choices: [travel, info, question, chat, rude],
    },
    { model: "gpt-4-turbo" }
  );

  log("Intent:", intent);

  if (intent === travel || intent === info) {
    const [, canOutline] = await mentalQuery(
      memory,
      "Kathor has enough information to write an outline of the itinerary.",
      {
        model: "gpt-4-turbo",
      }
    );

    if (canOutline) {
      return await withCodeOutline({ memory });
    } else {
      return await withMoreInformationRequest({ memory });
    }
  } else if (intent === question) {
    log("Thinking about the user's question");
    [memory, stream] = await internalMonologue(memory, "Think carefully about the intent of the user's question.", {
      model: "gpt-4-turbo",
      stream: true,
    });

    dispatch({
      action: "thinks",
      content: stream,
      _metadata: {
        // Add any relevant metadata here
      }
    });
  } else if (intent === rude) {
    log("Handling rude behavior");
    [memory, stream] = await internalMonologue(memory, "Process what the user has just said to you.", {
      model: "gpt-4-turbo",
      stream: true,
    });

    dispatch({
      action: "thinks",
      content: stream,
      _metadata: {
        // Add any relevant metadata here
      }
    });

    [memory, stream] = await externalDialog(
      memory,
      indentNicely`
        - Berate the user for being rude.
        - Belittle their intelligence, and lack of culture.
        - Demand an apology. 
      `,
      { stream: true, model: "gpt-4-turbo" }
    );
    dispatch({
      action: "answers",
      content: stream,
      _metadata: {
        // Add any relevant metadata here
      }
    });

    await memory.finished;

    setNextProcess(outraged);

    return memory
  }
  
  log("Answering the user's message");
  [memory, stream] = await externalDialog(memory, "Kathor answers the user's question", {
    stream: true,
    model: "gpt-4-turbo",
  });

  dispatch({
    action: "answers",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });
  
  await memory.finished;

  return memory;
};

const withCodeOutline = async ({ memory }: { memory: WorkingMemory }) => {
  const { speak, log, dispatch } = useActions();

  let stream;

  log("Outlining itinerary approach");
  [memory, stream] = await externalDialog(
    memory,
    indentNicely`
      Kathor does NOT PLAN ITERNARY yet. He just:
      1. outlines his iternary planning approach in a concise step-by-step list, using a few words for each step
      2. either:
        2.1. makes a list of all the information missing, if any
        2.2. OR if he has all the information he needs, says something like 'let's start building the itinerary!'
    `,
    {
      model: "gpt-4-turbo",
      stream: true,
    }
  );

  dispatch({
    action: "answers",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });
  
  await memory.finished;

  const [, isInformationMissing] = await mentalQuery(
    memory,
    "Kathor needs more information before he can start building the itinerary.",
    {
      model: "gpt-4-turbo",
    }
  );

  if (isInformationMissing) {
    return await withMoreInformationRequest({ memory });
  }

  return await withCodeWriting({ memory });
};

async function withMoreInformationRequest({ memory }: { memory: WorkingMemory }) {
  const { speak, log, dispatch } = useActions();

  let stream;

  [memory, stream] = await internalMonologue(memory, "Think carefully about the intent of the user's question.", {
    model: "gpt-4-turbo",
    stream: true,
  });

  dispatch({
    action: "thinks",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });

  log("Asking for more information");
  [memory, stream] = await externalDialog(memory, "Kathor asks the user for more information.", {
    model: "gpt-4-turbo",
    stream: true,
  });

  dispatch({
    action: "answers",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });
  

  return memory;
}

async function withCodeWriting({ memory }: { memory: WorkingMemory }) {
  const { speak, log, dispatch } = useActions();

  let stream;

  log("Writing the code based on all the available information");
  [memory, stream] = await externalDialog(
    memory,
    "Kathor writes the itinerary based on all the available information, enclosing iternary in ```",
    {
      model: "gpt-4-turbo",
      stream: true,
    }
  );

  dispatch({
    action: "answers",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });
  
  await memory.finished;

  return memory;
}

const honkReaction = async ({ memory }: { memory: WorkingMemory }) => {
  const { log, dispatch } = useActions();
  const {invokingPerception, pendingPerceptions} = usePerceptions();
  
  const gotHooked = invokingPerception?.action === "honked";

  const honkStep = memory.withMemory({
    role: ChatMessageRoleEnum.Assistant,
    content: "Kathor heard a loud, irritating honking noise."
  });
      
  let stream;

  if(!gotHooked) {
  [memory, stream] = await externalDialog(honkStep, "Respectfully, please don't press that button again, I'd rather not hear the noise.", {
    stream: true,
    model: "gpt-4-turbo",
  });

  dispatch({
    action: "answers",
    content: stream,
    _metadata: {
      // Add any relevant metadata here
    }
  });
  
  await memory.finished;

  return memory;
  }
}


export default initialProcess;
