import axios from "axios";

export class HordeClient {
  constructor(options = {}) {
    this.api_key = options.api_key || "0000000000";
    this.url = options.url || "https://aihorde.net/api/v2/";
    this.rescue_url =
      options.rescue_url || "https://horde.koboldai.net/api/v2/";
    this.client_agent =
      options.client_agent ||
      "horde-vue:1.1.0:github.com/scenaristeur/horde-vue";

    this.params = {
      n: 1,
      max_context_length: options.max_context_length || 1024,
      max_length: options.max_length || 200,
      rep_pen: 1.1,
      temperature: options.temperature || 0, //0.7,
      top_p: 0.92,
      top_k: 0,
      top_a: 0,
      typical: 1,
      tfs: 1,
      rep_pen_range: 320,
      rep_pen_slope: 0.7,
      sampler_order: [6, 0, 1, 3, 4, 2, 5],
      use_default_badwordsids: false,
      stop_sequence: options.stop_sequence ||["[INST]"]
    };
    this.models = [
      "koboldcpp/LLaMA2-13B-Tiefighter",
      "koboldcpp/LLaMA2-13B-Psyfighter2",
      "aphrodite/KoboldAI/LLaMA2-13B-Tiefighter",
      "koboldcpp/mistral-pygmalion-7b.Q5_K_M",
      "koboldcpp/OpenHermes-2.5-AshhLimaRP-Mistral-7B",
    ];
    this.state = null
  }

  log() {
    console.log(this.api_key, this.url, this.rescue_url)
    console.log("PARAMS", this.params);
  }

  setApiKey(api_key) {
    this.api_key = api_key;
  }
  async send(req) {
    let client = this;
    console.log(req.messages);
    this.headers = {
      Accept: "application/json",
      apikey: this.api_key,
      "Client-Agent": this.client_agent,
      "Content-Type": "application/json",
    };

    let result = { job: {} };
    let prompt = this.formatPrompt(req.messages);
    let llm_request_message = {
      prompt: prompt,
      params: this.params,
      models: /*params.models || */ this.models,
      workers: this.workers,
      seed: Math.floor(Math.random() * 1000), //45,
      nfsw: true,
    };

    console.log("###############REQUEST PARAMS", llm_request_message);
    //console.log('headers', headers)
    result.start = Date.now();

    try {
      let response = await axios({
        method: "post",
        url: this.url + "generate/text/async",
        data: llm_request_message,
        headers: this.headers,
      });
      console.log(/*response, */ response.data);

      // let check = await axios({
      //   method: "get",
      //   url: this.horde_url + "generate/text/status/" + response.data.id,
      //   // data: message,
      //   headers: this.headers,
      // });

      let textPromise = new Promise((resolve, reject) => {
        let timer = setInterval(async function () {
          let check = await axios({
            method: "get",
            url: client.url + "generate/text/status/" + response.data.id,
            headers: client.headers,
          });

          if (check.data.done == true) {
            result.end = Date.now();
            console.log("--GENERATION\n", check.data.generations[0], "\n--");
            let text =
              check.data.generations[0] &&
              check.data.generations[0].text.trim();

            console.log("----- text generated : ", text, "\n-----\n");

            result.job = check.data.generations[0];

            clearInterval(timer); // Stop the timer
            resolve(text); // Résoudre la promesse avec le texte
          } else {
            console.log(check.data);
            
          }
          client.state = check.data;
        }, 3000);
      });

      const text = await textPromise; // Attendre que la promesse soit résolue
      result.text = text;
      console.log("RETURN RESULT", result);

      //stream.write(JSON.stringify(result) + "\r\n");

      // if (
      //   result.text == undefined ||
      //   result.text.trim().length == 0 ||
      //   result.text.trim() == "}]" ||
      //   result.text.trim() == "]" ||
      //   result.text.trim() == "}"
      // ) {
      //   console.log("Text length = 0, retry");
      //   result = await this.completions(params);
      // }

      return result;
    } catch (e) {
      console.log("ERREUR", e);
    }
  }

  formatPrompt(prompt) {
    console.log("typeof prompt", typeof prompt, prompt);

if(typeof prompt=='object'){
  let formatedPrompt = ""
  prompt = prompt.map((message) => {

    // if (message.role == "user") {
    //   return `USER: ${message.content}`;
    // } else if (message.role == "assistant") {
    //   return `ASSISTANT: ${message.content}`;
    // }

    switch (message.role) {
      case "system":
        formatedPrompt += `SYSTEM: ${message.content}\n`;
          break;
          case"user":   
          formatedPrompt +=  `USER: ${message.content}\n`;
          break;
          case"assistant":
          formatedPrompt += `ASSISTANT: ${message.content}\n`;
          break;
          default:
            console.log("unknown role", message.role);
            break;
    }



    
  });
  formatedPrompt += `ASSISTANT:`;
  console.log("formatedPrompt", formatedPrompt);
  return formatedPrompt;
}else{
  return JSON.stringify(prompt)
}




  
  }
}
