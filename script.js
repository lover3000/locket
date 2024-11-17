let currentPage = 1;
const limit = 20; 
let imagesLoaded = 0; 


const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d'); // Lấy context của canvas

// Kiểm tra xem canvas và context có tồn tại không
if (!canvas || !ctx) {
    console.error("Không thể lấy canvas hoặc context.");
}

// Thiết lập camera (ví dụ với WebRTC)
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        // Gán video stream vào một video element tạm thời
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Vẽ video vào canvas mỗi frame
        function draw() {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(draw); // Tiếp tục vẽ ở frame tiếp theo
        }
        draw();
    })
    .catch(err => {
        console.error("Không thể truy cập camera:", err);
    });


function loadImages() {
    fetch(`http://${getServerIPCookie()}:3000/images?page=${currentPage}&limit=${limit}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể tải ảnh');
            }
            return response.json();
        })
        .then(data => {
            if (data.images && data.images.length > 0) {
                const imageListContainer = document.getElementById('imageList');
                data.images.forEach(imageUrl => {
                    // Tạo thẻ img để hiển thị ảnh
                    const imgElement = document.createElement('img');
                    imgElement.src = `http://${getServerIPCookie()}:3000${imageUrl}`;
                    imgElement.classList.add('object-fit-cover', 'my-2', 'rounded-4', 'w-40', 'h-40', 'p-sm-border', 'mx-2');

                    // Thêm ảnh vào container
                    imageListContainer.appendChild(imgElement);
                });

                // Tăng trang sau khi tải ảnh
                currentPage++;
            } else {
                alert('Không còn ảnh nào để tải!');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải ảnh:', error);
            alert('Không thể tải ảnh!');
        });
}

// Gọi hàm để tải 10 ảnh đầu tiên
loadImages();

// Hàm lấy IP từ cookie
function getServerIPCookie() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; serverIP=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}

// Show up
function checkIP() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; serverIP=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}
function display(){
    if(checkIP() != ''){
        document.getElementById('mainAppSection').classList.remove('d-none');
        document.getElementById('ipInputSection').classList.add('d-none');
    }
    else{
        document.getElementById('ipInputSection').classList.remove('d-none');
        document.getElementById('mainAppSection').classList.add('d-none');
    }   
}

function saveCookie(){
    const serverIP = document.getElementById('serverIP').value;
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = "serverIP=" + serverIP + ";" + expires + ";path=/";
}
window.onload = () => {
    display();
}
document.getElementById('loadMoreBtn').addEventListener('click', () => {
    loadImages();
});
document.getElementById('connectButton').addEventListener('click', () => {
    saveCookie();
    display();
});
document.getElementById('cameraIcon').addEventListener('click', () => {
    // Chuyển ảnh từ canvas ra dữ liệu URL
    const imageData = canvas.toDataURL('image/png');

    // Gửi ảnh lên server thông qua API
    uploadImage(imageData);
});

function dataURLtoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: 'image/png' });
}

function uploadImage(imageData) {
    // Tạo đối tượng FormData để gửi ảnh lên server
    const formData = new FormData();
    formData.append('image', dataURLtoBlob(imageData));

    // Gửi ảnh qua fetch API
    fetch(`http://${getServerIPCookie()}:3000/upload`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải ảnh lên');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Ảnh đã được tải lên thành công!');
            loadImages(); // Tải lại danh sách ảnh sau khi upload
        } else {
            alert('Có lỗi xảy ra khi tải ảnh lên!');
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải ảnh lên:', error);
        alert('Không thể tải ảnh lên!');
    });
}