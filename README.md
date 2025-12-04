# StationFlow

StationFlow, şehir içi ulaşımı kolaylaştırmak amacıyla geliştirilmiş, toplu taşıma duraklarını ve paylaşımlı araç istasyonlarını (bisiklet, scooter vb.) gerçek zamanlı olarak takip etmenizi(durak ne kadar yoğun, durakta kaç araç var vb.) sağlayan bir uygulamadır.

Bu repository, projenin **Frontend** kodlarını içermektedir. Projenin Backend kodları private bir repodadır.

## 🌐 Canlı Demo

Projeyi canlı olarak incelemek için: [https://stationflow.netlify.app](https://stationflow.netlify.app)

## 🚀 Özellikler

*   **İnteraktif Harita:** Tüm durakları ve istasyonları harita üzerinde görüntüleme.
*   **Gerçek Zamanlı Durum:** İstasyon doluluk oranlarının ve durumlarının (Aktif, Bakımda, Dolu vb.) anlık olarak güncellenmesi (Server-Sent Events ile).
*   **Akıllı Rota Oluşturma:** Bulunduğunuz konumdan seçtiğiniz istasyona en uygun rotayı çizme.
*   **Kapsamlı Filtreleme:** Otobüs, Metro, Bisiklet, Scooter, Minibüs, Taksi ve Dolmuş gibi farklı ulaşım türlerine göre filtreleme.
*   **Yönetici Paneli (Admin):** Yetkili kullanıcılar için istasyon ekleme, silme, güncelleme ve kullanıcı geri bildirimlerini yönetme özellikleri.
*   **Kullanıcı Etkileşimi:** İstasyon durumu bildirme ve genel geri bildirim gönderme sistemi.
*   **Kişiselleştirme:** Karanlık Mod (Dark Mode) ve Çoklu Dil Desteği (Türkçe/İngilizce).
*   **Güvenlik:** JWT tabanlı kimlik doğrulama ve güvenli giriş sistemi.

## 🛠 Teknolojiler

### Frontend (Bu Repo)
*   **Framework:** React (Vite ile)
*   **Dil:** TypeScript
*   **Stil:** Tailwind CSS
*   **Harita:** Leaflet & React-Leaflet
*   **İkonlar:** Lucide React
*   **Durum Yönetimi:** React Context API

### Backend (Private)
*   **Framework:** Java Spring Boot
*   **Veritabanı:** PostgreSQL
*   **Konteynerizasyon:** Docker & Docker Compose
*   **Güvenlik:** Spring Security & JWT

## 📦 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

2.  **Geliştirme Sunucusunu Başlatın:**
    ```bash
    npm run dev
    ```

3.  **Tarayıcıda Açın:**
    Uygulama genellikle `http://localhost:3000` adresinde çalışacaktır.

## 📝 Notlar

*   Bu proje, backend servisine `http://localhost:8080` (varsayılan) üzerinden bağlanacak şekilde yapılandırılmıştır. Backend servisi çalışmıyorsa harita verileri ve oturum işlemleri simüle edilebilir veya hata verebilir.
*   Harita alt yapısı için OpenStreetMap ve CARTO sağlayıcıları kullanılmaktadır.
*   Uygulamada gösterilen yoğunluk oranları ve araç sayıları simülasyon amaçlı **mock (örnek)** verilerdir.
*   Durak verilerinin bir kısmı İBB API aracılığıyla Cron Job ile güncellenmekte, bir kısmı ise İBB den alınan statik geojson verilerle oluşturulmuştur.

## 🤝 Katkıda Bulunma

Bu proje şu anda kapalı geliştirme sürecindedir. Ancak hata bildirimleri ve özellik istekleri için Feedback formu üzerinden iletebilirsiniz.

---
*Developed by Olcay*

---

# StationFlow (English)

StationFlow is an application designed to facilitate urban transportation, allowing you to track public transport stops and shared vehicle stations (bikes, scooters, etc.) in real-time (how busy the stop is, how many vehicles are at the stop, etc.).

This repository contains the **Frontend** code of the project. The Backend code of the project is in a private repository.

## 🌐 Live Demo

Check out the live project here: [https://stationflow.netlify.app](https://stationflow.netlify.app)

## 🚀 Features

*   **Interactive Map:** View all stops and stations on the map.
*   **Real-Time Status:** Instant updates of station occupancy rates and statuses (Active, Maintenance, Full, etc.) (via Server-Sent Events).
*   **Smart Routing:** Draw the most suitable route from your current location to the selected station.
*   **Comprehensive Filtering:** Filter by different transportation types such as Bus, Metro, Bike, Scooter, Minibus, Taxi, and Dolmus.
*   **Admin Panel:** Features for authorized users to add, delete, update stations, and manage user feedback.
*   **User Interaction:** System for reporting station status and sending general feedback.
*   **Personalization:** Dark Mode and Multi-Language Support (Turkish/English).
*   **Security:** JWT-based authentication and secure login system.

## 🛠 Technologies

### Frontend (This Repository)
*   **Framework:** React (with Vite)
*   **Language:** TypeScript
*   **Style:** Tailwind CSS
*   **Map:** Leaflet & React-Leaflet
*   **Icons:** Lucide React
*   **State Management:** React Context API

### Backend (Private)
*   **Framework:** Java Spring Boot
*   **Database:** PostgreSQL
*   **Containerization:** Docker & Docker Compose
*   **Security:** Spring Security & JWT

## 📦 Installation and Running

You can follow the steps below to run the project in your local environment:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```

3.  **Open in Browser:**
    The application will usually run at `http://localhost:3000`.

## 📝 Notes

*   This project is configured to connect to the backend service via `http://localhost:8080` (default). If the backend service is not running, map data and session operations may be simulated or give errors.
*   OpenStreetMap and CARTO providers are used for the map infrastructure.
*   The occupancy rates and vehicle counts shown in the application are **mock data** for simulation purposes.
*   Some station data is updated via IBB API using Cron Jobs, while some is created using static geojson data obtained from IBB.

## 🤝 Contribution

This project is currently in a closed development process. However, you can submit bug reports and feature requests via the Feedback form.

---
*Developed by Olcay*