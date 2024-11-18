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
navigator.mediaDevices.getUserMedia({
    video: { 
        facingMode: { ideal: 'environment' } // Mặc định dùng camera sau
    } 
})
.then(stream => {
    // Gán video stream vào một video element tạm thời
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    video.onloadedmetadata = () => {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Tính toán vùng cắt để tạo hình ảnh 1:1
        let cropX = 0;
        let cropY = 0;
        let cropSize = 0;

        if (videoWidth > videoHeight) {
            // Video rộng hơn -> cắt hai bên
            cropSize = videoHeight;
            cropX = (videoWidth - cropSize) / 2; // Cắt đều từ hai bên
        } else {
            // Video cao hơn hoặc bằng -> cắt trên và dưới
            cropSize = videoWidth;
            cropY = (videoHeight - cropSize) / 2; // Cắt đều từ trên và dưới
        }

        // Xóa canvas trước khi vẽ
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vẽ video vào canvas mỗi frame
        function draw() {
            ctx.drawImage(
                video,            // Video nguồn
                cropX,            // Bắt đầu cắt từ X
                cropY,            // Bắt đầu cắt từ Y
                cropSize,         // Chiều rộng vùng cắt
                cropSize,         // Chiều cao vùng cắt
                0,                // Vẽ bắt đầu từ X của canvas
                0,                // Vẽ bắt đầu từ Y của canvas
                canvas.width,     // Chiều rộng canvas
                canvas.height     // Chiều cao canvas
            );
            requestAnimationFrame(draw); // Tiếp tục vẽ ở frame tiếp theo
        }
        draw();
    };
})
.catch(err => {
    console.error("Không thể truy cập camera:", err);
});
let isFrontCamera = true;
async function switchCamera() {
    // Nếu đã có stream, dừng tất cả các track
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        // Chuyển đổi giữa camera trước và sau
        const constraints = {
            video: {
                facingMode: isFrontCamera ? 'environment' : 'user' // 'environment' là camera sau, 'user' là camera trước
            }
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = currentStream;
        videoElement.play();

        // Đảo trạng thái camera
        isFrontCamera = !isFrontCamera;
    } catch (error) {
        console.error('Không thể chuyển đổi camera:', error);
        alert('Lỗi khi chuyển đổi camera');
    }
}

document.getElementById("switchButton").addEventListener("click", switchCamera);

function loadImages(newImage = false) {
    let baseUrl = `${getServerIPCookie()}/images?page=${currentPage}&limit=${limit}`;
    if(newImage) baseUrl = `${getServerIPCookie()}/images?page=${1}&limit=${1}`;
    fetch(baseUrl)
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.images && data.images.length > 0) {
                const imageListContainer = document.getElementById('imageList');
                data.images.forEach(imageUrl => {
                    // Tạo thẻ img để hiển thị ảnh
                    const imgElement = document.createElement('img');
                    imgElement.src = `${getServerIPCookie()}${imageUrl}`;
                    imgElement.classList.add('object-fit-cover', 'my-2', 'rounded-4', 'w-40', 'h-40', 'p-sm-border', 'mx-2');

                    // Thêm ảnh vào container
                    if(newImage) imageListContainer.prepend(imgElement);
                    else imageListContainer.appendChild(imgElement);

                });

                // Tăng trang sau khi tải ảnh
                currentPage++;
            } else {
                alert('Không còn ảnh nào để tải!');
            }
        })
        .catch(error => {
            console.error('Không tìm thấy ảnh:', error);
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
    fetch(`${getServerIPCookie()}/upload`, {
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
            loadImages(true);
        } else {
            alert('Có lỗi xảy ra khi tải ảnh lên!');
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải ảnh lên:', error);
        alert('Không thể tải ảnh lên!');
    });
}