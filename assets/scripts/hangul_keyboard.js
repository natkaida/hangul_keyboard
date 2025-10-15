// ======= Настройки клавиатуры =======
const punctuation = [".", ",", "?", "!", "\"", "(", ")"];
const layout = [
  [["ㅂ","Q"],["ㅈ","W"],["ㄷ","E"],["ㄱ","R"],["ㅅ","T"],["ㅛ","Y"],["ㅕ","U"],["ㅑ","I"],["ㅐ","O"],["ㅔ","P"]],
  [["ㅁ","A"],["ㄴ","S"],["ㅇ","D"],["ㄹ","F"],["ㅎ","G"],["ㅗ","H"],["ㅓ","J"],["ㅏ","K"],["ㅣ","L"]],
  [["ㅋ","Z"],["ㅌ","X"],["ㅊ","C"],["ㅍ","V"],["ㅠ","B"],["ㅜ","N"],["ㅡ","M"]]
];
const shiftByEng = {"q":"ㅃ","w":"ㅉ","e":"ㄸ","r":"ㄲ","t":"ㅆ","o":"ㅒ","p":"ㅖ"};

// ======= Состояние =======
const keyboardRoot = document.getElementById("keyboard");
const output = document.getElementById("output");
const fileInput = document.getElementById("fileInput");
const fileDisplay = document.getElementById("fileDisplay");
const checkBtn = document.getElementById("checkBtn");

let buffer = [];
let isShift = false;
const keyElements = {};
let shiftButtonEl = null;
let correctWords = [];
let isChecked = false;

// ======= Вспомогательные =======
function updateOutput() {
  // показываем собранный текст (buffer -> assemble)
  try { output.textContent = Hangul.assemble(buffer); }
  catch (e) { output.textContent = buffer.join(""); }
}
function highlightBtn(btn){
  if(!btn) return;
  btn.classList.add("active");
  setTimeout(()=>btn.classList.remove("active"),140);
}

// ставит caret в конец contenteditable элемента
function setCaretToEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false); // в конец
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// снимает подсветку (восстанавливает plain текст) и ставит курсор в конец
function clearHighlights() {
  if (!isChecked) return;
  // получаем plain текст (с переносами)
  const plainText = output.innerText || "";
  // записываем как простой текстовый узел (убираем тэги)
  output.innerHTML = "";
  output.appendChild(document.createTextNode(plainText));
  // синхронизируем buffer
  buffer = Array.from(plainText);
  isChecked = false;
  // ставим каретку в конец (после последнего набранного символа)
  setCaretToEnd(output);
}

// ======= Создание клавиш =======
function makeLetterButton(parent, kor, eng){
  const btn = document.createElement("button");
  btn.className="key";
  btn.innerHTML=`<span class="kor">${kor}</span><span class="eng">${eng}</span>`;
  btn.dataset.eng = eng;
  btn.dataset.baseKor = kor;
  btn.addEventListener("click",()=>{ 
    clearHighlights();
    const engLower=eng.toLowerCase(); 
    const toPush=(isShift && shiftByEng[engLower])?shiftByEng[engLower]:kor;
    buffer.push(toPush); updateOutput(); highlightBtn(btn); setCaretToEnd(output);
  });
  parent.appendChild(btn);
  keyElements[eng.toLowerCase()]=btn;
  return btn;
}
function makePunctuationButton(parent,ch){
  const btn=document.createElement("button");
  btn.className="key";
  btn.innerHTML=`<span class="kor">${ch}</span>`;
  btn.dataset.punc=ch;
  btn.addEventListener("click",()=>{
    clearHighlights();
    buffer.push(ch); updateOutput(); highlightBtn(btn); setCaretToEnd(output);
  });
  parent.appendChild(btn);
  keyElements[ch]=btn;
  return btn;
}
function refreshShiftDisplay(){
  Object.entries(keyElements).forEach(([key,btn])=>{
    if(!btn.dataset.baseKor || !btn.querySelector(".kor")) return;
    const eng=btn.dataset.eng; const engLower=eng.toLowerCase(); const baseKor=btn.dataset.baseKor;
    const newKor=(isShift && shiftByEng[engLower])?shiftByEng[engLower]:baseKor;
    btn.querySelector(".kor").textContent=newKor;
  });
}
function buildKeyboard(){
  keyboardRoot.innerHTML="";
  layout.forEach(row=>{
    const rowEl=document.createElement("div");
    rowEl.className="row";
    row.forEach(([kor,eng])=>makeLetterButton(rowEl,kor,eng));
    keyboardRoot.appendChild(rowEl);
  });
  const pRow=document.createElement("div");
  pRow.className="row";
  punctuation.forEach(ch=>makePunctuationButton(pRow,ch));
  keyboardRoot.appendChild(pRow);

  const bottom=document.createElement("div");
  bottom.className="row";

  const sBtn=document.createElement("button");
  sBtn.className="key wide"; sBtn.textContent="Shift";
  sBtn.addEventListener("mousedown",()=>{ isShift=true; refreshShiftDisplay(); sBtn.classList.add("active"); });
  sBtn.addEventListener("mouseup",()=>{ isShift=false; refreshShiftDisplay(); sBtn.classList.remove("active"); });
  sBtn.addEventListener("mouseleave",()=>{ isShift=false; refreshShiftDisplay(); sBtn.classList.remove("active"); });
  shiftButtonEl=sBtn;
  bottom.appendChild(sBtn);

  const backBtn=document.createElement("button");
  backBtn.className="key"; backBtn.textContent="←";
  backBtn.addEventListener("click",()=>{
    clearHighlights();
    // если есть фокус в output — удаляем символ перед caret, иначе удаляем последний символ
    if (document.activeElement === output) {
      // удаляем символ слева от каретки
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
          // есть выделение — удаляем
          range.deleteContents();
        } else {
          // удалить предшествующий символ:
          // получим позицию и манипулируем текстовый узел
          const node = range.startContainer;
          const offset = range.startOffset;
          if (node.nodeType === Node.TEXT_NODE && offset > 0) {
            const text = node.textContent;
            node.textContent = text.slice(0, offset-1) + text.slice(offset);
            // сдвинем курсор
            const newRange = document.createRange();
            newRange.setStart(node, offset-1);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          } else {
            // fallback — удалить последний символ всего текста
            buffer.pop();
            updateOutput();
            setCaretToEnd(output);
          }
        }
      }
    } else {
      buffer.pop();
      updateOutput();
      setCaretToEnd(output);
    }
  });
  bottom.appendChild(backBtn);

  const spaceBtn=document.createElement("button");
  spaceBtn.className="key wide"; spaceBtn.textContent="Space";
  spaceBtn.addEventListener("click",()=>{
    clearHighlights();
    buffer.push(" "); updateOutput(); highlightBtn(spaceBtn); setCaretToEnd(output);
  });
  bottom.appendChild(spaceBtn);

  const enterBtn=document.createElement("button");
  enterBtn.className="key"; enterBtn.textContent="Enter";
  enterBtn.addEventListener("click",()=>{
    clearHighlights();
    buffer.push("\n"); updateOutput(); highlightBtn(enterBtn); setCaretToEnd(output);
  });
  bottom.appendChild(enterBtn);

  keyboardRoot.appendChild(bottom);
}

// ======= Обработка физической клавиатуры =======
document.addEventListener("keydown",(e)=>{
  if (e.ctrlKey || e.metaKey) return;
  if(e.key==="Shift"){ isShift=true; refreshShiftDisplay(); if(shiftButtonEl) shiftButtonEl.classList.add("active"); return; }
  if(e.key==="Backspace"){ clearHighlights(); /* далее позволим обработку в 'keyup' or handled by backBtn logic via input events */ return; }
  if(e.key==="Enter"){ clearHighlights(); buffer.push("\n"); updateOutput(); setCaretToEnd(output); e.preventDefault(); return; }
  if(e.key===" "){ clearHighlights(); buffer.push(" "); updateOutput(); setCaretToEnd(output); e.preventDefault(); return; }
  if(punctuation.includes(e.key)){ clearHighlights(); buffer.push(e.key); updateOutput(); highlightBtn(keyElements[e.key]); setCaretToEnd(output); e.preventDefault(); return; }
  const key=e.key.toLowerCase(); const btn=keyElements[key];
  if(btn && btn.dataset.baseKor){ e.preventDefault(); clearHighlights(); const baseKor=btn.dataset.baseKor; const toPush=(isShift && shiftByEng[key])?shiftByEng[key]:baseKor; buffer.push(toPush); updateOutput(); highlightBtn(btn); setCaretToEnd(output); return; }
});
document.addEventListener("keyup",(e)=>{ if(e.key==="Shift"){ isShift=false; refreshShiftDisplay(); if(shiftButtonEl) shiftButtonEl.classList.remove("active"); } });

// ======= При ручном редактировании снимаем подсветку и синхронизируем буфер =======
output.addEventListener("input", () => {
  // если была подсветка — снимем её и восстановим caret в правильной позиции
  if (isChecked) {
    // сохраняем позицию в конце текста по умолчанию
    const prevLen = (output.innerText || "").length;
    clearHighlights(); // установит caret в конец
    // buffer уже синхронизирован в clearHighlights
    return;
  }
  // обычный ввод: синхронизируем buffer с текстом
  buffer = Array.from(output.innerText);
});

// ======= Загрузка слов из файла =======
fileInput.addEventListener("change", (event)=>{
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result.trim();
    fileDisplay.textContent = content;
    correctWords = content.split(/\s+/);
  };
  reader.readAsText(file,"UTF-8");
});

// ======= Проверка слов =======
checkBtn.addEventListener("click", ()=>{
  const text = (output.innerText || "").trim();
  if (!text) { alert("Введите текст для проверки."); return; }
  if (correctWords.length === 0) { alert("Загрузите файл со списком правильных слов."); return; }

  const words = text.split(/\s+/);
  const checked = words.map(word => {
    if (correctWords.includes(word)) {
      return `<span class="correct">${word}</span>`;
    } else {
      return `<span class="incorrect">${word}</span>`;
    }
  });
  output.innerHTML = checked.join(" ");
  isChecked = true;
  // после проверки ставим caret в конец (если нужно продолжить набор после результатов)
  setCaretToEnd(output);
});

// ======= Инициализация =======
buildKeyboard();
updateOutput();
