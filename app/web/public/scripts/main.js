// if (window.XMLHttpRequest) { xmlHttp = new XMLHttpRequest(); }
// else { xmlHttp = new ActiveXObject('Microsoft.XMLHTTP'); }

// let presets = loadXml('/data/presets.xml').getElementsByTagName('preset');
// let presetsNames = []

// for (let i = 0; i < presets.length; i++) {
//     const optionHTML = `<option value="${i}">${presets[i].getAttribute('name')}</option>`;
//     document.getElementById('presets').insertAdjacentHTML('beforeend', optionHTML);
// }

// let images = loadXml('/data/images.xml').getElementsByTagName('image');
// let imagesNames = []

// for (let i = 0; i < images.length; i++) {
//     imagesNames.push(images[i].getAttribute('name'))
// }

// function loadXml(path)
// {
//     xmlHttp.open('GET', path, false);
//     xmlHttp.send();
//     xmlDoc = xmlHttp.responseXML;
//     return xmlDoc;
// }

function addToQueue()
{
    let type = document.getElementsByName("typeId")[0].value;
    if (type == 0)
    {
        let textareaHTML = `<div name="part"><div class="content_lable" name="text" style="background-color: rgb(112, 88, 124); text-shadow: 1px 1px 2px black;"><h3>Текст</h3></div><textarea class="styled_input_text" style="color: rgb(42, 224, 200);" name="0" placeholder="text" maxlength="2000"></textarea></div>`
        document.getElementById('content').insertAdjacentHTML('beforeend', textareaHTML)
        return
    }
    if (type == 2)
    {
        let textareaHTML = `<div name="part"><div class="content_lable" name="embed" style="background-color: rgb(64, 108, 135); text-shadow: 1px 1px 2px black;"><h3>Эмбед</h3></div><h4 class="content_lable">Цвет</h4><div class="styled_input_color" style="display: grid; grid-template-rows: auto 1fr;"><input name="0" type="color"/></div>
        <h4 class="content_lable">Название</h4><textarea name="1" class="styled_input_text_embed" placeholder="text" maxlength="100" style="color: rgb(42, 224, 200);"></textarea>
        <h4 class="content_lable">Описание</h4><textarea name="2" class="styled_input_text" placeholder="text" maxlength="2000" style="color: rgb(42, 224, 200);"></textarea>
        <h4 class="content_lable">Ссылка на изображение</h4><textarea name="3" class="styled_input_text_embed_long" placeholder="url" maxlength="300" style="color: rgb(42, 224, 200);"></textarea></div></div>`
        document.getElementById('content').insertAdjacentHTML('beforeend', textareaHTML)
        return
    }
    let textareaHTML = `<div name="part"><div class="content_lable" name="file" style="background-color: rgb(89, 100, 117); text-shadow: 1px 1px 2px black;"><h3>Файл</h3><div class="styled_input_file" style="display: grid; grid-template-rows: auto 1fr; color: rgb(42, 224, 200);"><input type="file" name="0"/><img src="" width="200" height=auto style="padding: .4em 0 0 0;"/></div>`
    document.getElementById('content').insertAdjacentHTML('beforeend', textareaHTML)

    const fileInput = document.getElementById('content').lastElementChild.querySelector('input[type="file"]');

    fileInput.onchange = event => {
        const reader = new FileReader();
        
        reader.onload = e => {
            const img = fileInput.parentElement.querySelector('img');
            if (img) {
                img.src = e.target.result;
            }
        };
        
        try {
            reader.readAsDataURL(fileInput.files[0]);
        } catch {
            const img = fileInput.parentElement.querySelector('img');
            if (img) {
                img.src = "";
            }
        }
    };
}

document.getElementById('contentForm').addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const channelId = document.getElementsByName('channelId')[0].value;
    const token = document.getElementsByName("token")[0].value;

    for (let elem of document.getElementsByName("part")) {
        if (elem.children[0].getAttribute('name') === 'file') {
            const file = elem.querySelector('[name="0"]').files[0];

            if (!file) {
                alert('Please select an image');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);
            formData.append('channelId', channelId);
            formData.append('token', token);

            try {
                await fetch('/sendImage', {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error:', error);
            }

        }
        else if (elem.children[0].getAttribute('name') === 'embed') {
            const colorHex = elem.querySelector('[name="0"]').value;
            let color = parseInt(colorHex.replace('#', ''), 16);

            const title = elem.querySelector('[name="1"]').value;
            const description = elem.querySelector('[name="2"]').value;
            const imgUrl = elem.querySelector('[name="3"]').value;

            const formData = new FormData();
            formData.append('color', color);
            formData.append('description', description);
            formData.append('imgUrl', imgUrl);
            formData.append('title', title);
            formData.append('channelId', channelId);
            formData.append('token', token);

            try {
                await fetch('/sendEmbed', {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }
        else {
            const text = elem.querySelector('[name="0"]').value;
            console.log(text);

            const formData = new FormData();
            formData.append('text', text);
            formData.append('channelId', channelId);
            formData.append('token', token);

            try {
                await fetch('/sendMessage', {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }

    console.log('All messages sent successfully');
});