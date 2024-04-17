import { MentalProcess, indentNicely, useActions, useProcessManager } from "@opensouls/engine";
import mentalQuery from "../lib/mentalQuery.js";
import externalDialog from "../lib/externalDialog.js";
import internalMonologue from "../lib/internalMonologue.js";

import initialProcess from "../initialProcess.js";


const outraged: MentalProcess = async ({ workingMemory: memory }) => {
  const { speak, log, dispatch } = useActions();
  const { setNextProcess } = useProcessManager();

  let stream;

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

  const [, shouldForgive] = await mentalQuery(
    memory,
    `Did the user apologize for being rude, or admit they were wrong?`
  );

  log("Has the user apologized", shouldForgive);
  if (shouldForgive) {
    [memory, stream] = await internalMonologue(memory, "I'll give this client another chance, but my feelings about them won't be the same.", 
    { stream: true, model: "gpt-4-turbo" });
    
    dispatch({
      action: "thinks",
      content: stream,
      _metadata: {
        // Add any relevant metadata here
      }
    });
    await memory.finished;
    setNextProcess(initialProcess);
  }

  return memory;
};

export default outraged;

