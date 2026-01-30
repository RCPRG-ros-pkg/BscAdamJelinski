# Przeglądarkowy system wizualizacji robota mobilnego z użyciem wirtualnej rzeczywistości

## Opis projektu

Projekt ten jest systemem wizualizacji danych z robota mobilnego korzystającego z systemu ROS. Bazuje on na aplikacji przeglądarkowej, dla zapewnienia przenośności i kompatybilności z różnymi urządzeniami. Aplikacja ta wykorzystuje technologię WebXR do umożliwienia użytkownikom interakcji z środowiskiem robota w wirtualnej rzeczywistości. System pozwala na wizualizację danych z czujników robota, takich jak kamery głębi czy lidary, oraz danych z systemów nawigacyjnych, takich jak mapy kosztów czy trajektorie ruchu. Dla umożliwienia komfortowej interakcji w VR, aplikacja wykorzystuje kontrolery ruchu do implementacji różnych metod nawigacji w wirtualnej przestrzeni.

## Przykładowe działanie

[![Film z testami systemu](https://img.youtube.com/vi/Z3Bws7ZfdoI/0.jpg)](https://youtu.be/Z3Bws7ZfdoI)

## Instrukcja użytkowania

### Instalacja

System projektowany jest pod środowisko ROS 2 Humble, z założeniem, że użytkownik posiada działającą instalację ROS oraz przestrzeń roboczą. Ścieżka do przestrzeni roboczej oznaczona jest jako `<ros_workspace>`.

Kroki instalacji:

1. Sklonować repozytorium do katalogu `src` w przestrzeni roboczej.
2. Zainstalować zależności za pomocą `rosdep`.
3. Zbudować warstwę kliencką uruchamiając skrypt `build_frontend.sh` z pakietu `web_robot_control`.
4. Zbudować przestrzeń roboczą za pomocą `colcon`.

```bash
cd <ros_workspace>/src
git clone https://github.com/RCPRG-ros-pkg/BscAdamJelinski.git

rosdep install --from-paths . --ignore-src -r -y

./BscAdamJelinski/web_robot_control/build_frontend.sh

cd <ros_workspace>
colcon build
```

Po wykonaniu powyższych kroków system powinien być zainstalowany i gotowy do konfiguracji.

### Konfiguracja

Konfiguracja dzieli się na dwie części: warstwę serwerową i kliencką. Warstwa serwerowa konfigurowana jest przez argumenty pliku launch, a warstwa kliencka przez plik YAML przekazywany jako argument `config` do launcha.

#### Warstwa serwerowa

Główne komponenty uruchamiane są przez plik [`backend.launch`](web_robot_control/launch/backend.launch) w katalogu `launch` pakietu `web_robot_control`. Argumenty tego pliku to:

- `server_host` - adres IP interfejsu sieciowego (domyślnie `0.0.0.0` oznaczające nasłuchiwanie na wszystkich interfejsach)
- `server_port` - port serwera HTTP (domyślnie `8080`)
- `rosbridge_host` - adres hosta dla węzła `rosbridge_websocket` (domyślnie `localhost`)
- `rosbridge_port` - port `rosbridge_websocket` (domyślnie `9090`)
- `config` - zawartość pliku YAML konfiguracyjnego systemu wizualizacji

W większości przypadków jedynie parametr `config` wymaga dostosowania do potrzeb użytkownika. Pozostałe parametry są przydatne, gdy trzeba zmienić domyślne porty lub ograniczyć dostęp do serwera do określonych interfejsów sieciowych.

#### Warstwa kliencka

Warstwa kliencka konfigurowana jest przez plik YAML przekazywany jako parametr `config`. Przykładowy plik konfiguracyjny znajduje się w [`config/example_config.yaml`](web_robot_control/config/example_config.yaml) pakietu `web_robot_control`.

Plik podzielony jest na sekcje:

- `tf` - konfiguracja związana z ramkami tf2
- `robot` - konfiguracja wyświetlania modelu robota
- `grid` - konfiguracja siatki odniesienia
- `vrPublisher` - konfiguracja publikacji stanu gogli VR
- `topics` - lista tematów do wizualizacji wraz z ich konfiguracją

W sekcji `tf` można określić ramkę odniesienia świata, która będzie używana jako punkt 0,0,0 w przestrzeni wizualizacji. Pozostałe parametry `angular_threshold` oraz `translation_threshold` określają progi minimalnej zmiany orientacji i pozycji danej ramki tf2, poniżej których ramka nie będzie aktualizowana w wizualizacji. Ma to na celu ograniczenie liczby aktualizacji ramek tf2, które mogłyby przeciążyć łącze sieciowe.

Najważniejszym parametrem w sekcji `robot` jest `joint_states_topics`. Jest to lista tematów typu `sensor_msgs/JointState`, z których będą pobierane stany złączy robota do wizualizacji. W celu zapewnienia poprawności wizualizacji konieczne jest podanie wszystkich tematów, na których publikowane są stany złączy robota. Dodatkowo parametr `enabled` pozwala na włączenie lub wyłączenie wyświetlania modelu robota.

Sekcja `grid` umożliwia konfigurację siatki odniesienia, która wyświetlana jest wokół punktu 0,0,0 w przestrzeni wizualizacji. Parametr `enabled` umożliwia włączenie lub wyłączenie wyświetlania siatki. Parametr `cellCount` określa liczbę komórek siatki w każdą stronę od środka wizualizacji, natomiast parametr `cellSize` określa rozmiar pojedynczej komórki siatki wyrażony w metrach. Jest to konwencja zgodna z rviz-em.

Parametry sekcji `vrPublisher` pozwalają na konfigurację publikacji pozycji gogli VR oraz kontrolerów. Parametr `enabled` pozwala na włączenie lub wyłączenie publikacji. Parametry `headsetTopic`, `leftControllerTopic` oraz `rightControllerTopic` określają tematy, na których publikowane będą pozycje gogli VR oraz kontrolerów. Parametr `publishRate` określa częstotliwość publikacji pozycji, wyrażoną w hercach.

Ostatnia, najważniejsza sekcja pliku konfiguracyjnego to `topics`. Jest to lista tematów, które mają być wizualizowane w systemie. Każdy temat opisany jest przez obiekt zawierający trzy wartości: nazwę tematu (`name`), typ wiadomości ROS (`type`) oraz konfigurację wizualizacji danego tematu (`options`). Lista obsługiwanych typów wiadomości oraz opcji konfiguracji dla nich to:

- `nav_msgs/Path`
    - `lineWidth` - szerokość linii ścieżki, w pikselach
    - `color` - kolor linii ścieżki w formacie szesnastkowym: `0xRRGGBB`
- `nav_msgs/OccupancyGrid`
    - `colorScheme` - schemat kolorów używany do wizualizacji mapy; dostępne opcje: `map` (czarno-biały) oraz `costmap` (kolorowy, zgodny z rviz-em)
    - `showUnknown` - czy komórki o nieznanej wartości mają być wyświetlane
    - `unknownColor` - kolor komórek o nieznanej wartości w formacie szesnastkowym: `0xRRGGBB`
    - `zOffset` - przesunięcie mapy w osi Z w metrach (pomocne przy nakładaniu się elementów)
- `sensor_msgs/PointCloud2`
    - `maxPoints` - maksymalna liczba punktów wyświetlanych z pojedynczej wiadomości; nadmiar punktów zostanie odrzucony
    - `pointSize` - rozmiar pojedynczego punktu w metrach
    - `colorMode` - tryb kolorowania punktów; dostępne opcje: `RGB` (kolory z wiadomości) oraz `rainbow` (kolory na podstawie odległości od kamery)
    - `maxTraces` - maksymalna liczba historycznych wiadomości wyświetlanych jednocześnie; `1` oznacza tylko najnowszą wiadomość
- `nav_msgs/Odometry`
    - `axesSize` - rozmiar układu współrzędnych w metrach
    - `lineWidth` - grubość linii układu współrzędnych w pikselach
- `geometry_msgs/PoseStamped` - konfiguracja taka jak dla `nav_msgs/Odometry`
- `visualization_msgs/Marker` - brak dodatkowych opcji konfiguracji

Lista ta może być rozszerzona o kolejne typy wiadomości poprzez dodanie modułów wizualizacyjnych.

Dodatkowo każdy tryb wizualizacji (oprócz `visualization_msgs/Marker`) posiada parametry wspólne:

- `opacity` - przezroczystość wizualizowanego obiektu (0.0 - niewidoczny, 1.0 - nieprzezierny)
- `renderOrder` - kolejność renderowania obiektów (niższa wartość oznacza wyświetlanie na wierzchu), przydatne przy nakładaniu się obiektów

Podczas konfiguracji wizualizacji chmur punktów należy pamiętać o ograniczeniach wydajnościowych przeglądarek internetowych. Ustawienie zbyt wysokich wartości parametrów `maxPoints` oraz `maxTraces` może spowodować znaczące pogorszenie płynności działania wizualizacji, a w skrajnych przypadkach doprowadzić do wykorzystania całej dostępnej pamięci systemu.

### Kompresja chmur punktów i wyświetlanie mapy świata

Jako część systemu opracowano mechanizm kompresji chmur punktów, który ogranicza obciążenie systemu wizualizacji. Aby z niego skorzystać, należy uruchomić węzeł `pointcloud_downsampler` z pakietu `pointcloud_downsampler`.

Węzeł przyjmuje trzy argumenty:

- `input` - nazwa tematu wejściowego
- `output` - nazwa tematu wyjściowego
- `resolution` - rozdzielczość po kompresji (w metrach)

Parametr `resolution` określa rozmiar siatki użytej do downsamplingu. Przykładowo `0.05` oznacza siatkę z sześcianów o boku 5 cm, gdzie w każdym sześcianie pozostaje maksymalnie jeden punkt. Wartość należy dobrać eksperymentalnie, zależnie od możliwości sprzętu i charakteru danych.

Aby wyświetlić mapę świata, należy użyć węzła `mesh_publisher` z pakietu `web_robot_control`. Węzeł ten posiada argumenty:

- `mesh_resource` - ścieżka do zasobu modelu 3D, np. `package://<nazwa_pakietu>/<ścieżka_pliku>`
- `topic` - temat, na którym publikowana będzie mapa
- `pose` - pozycja mapy w wizualizacji jako tablica 7 wartości: `[x, y, z, qx, qy, qz, qw]`

Obsługiwane formaty modeli: `DAE`, `STL`, `GLB`, `GLTF`.

Przykładowy plik launch uruchamiający system wraz z kompresją chmur punktów i publikacją mapy świata znajduje się w [`launch/example.launch`](web_robot_control/launch/example.launch) w pakiecie `web_robot_control`.

### Korzystanie z systemu

Po przygotowaniu plików launch oraz YAML system można uruchomić poleceniem `ros2 launch`. Dla symulacji robota TIAGo można użyć gotowego pliku:

```bash
ros2 launch web_robot_control example.launch
```

Po uruchomieniu aplikacja jest dostępna pod adresem:

- `https://<adres_ip_robota>:<port_serwera>` - w przypadku uruchomienia na robocie w sieci
- `https://localhost:8080` - w przypadku uruchomienia lokalnie

System jest projektowany głównie do pracy w sieci lokalnej, jednak możliwy jest również dostęp przez Internet po odpowiedniej konfiguracji (np. przekierowanie portów lub VPN).

Przy pierwszym wejściu na stronę przeglądarka wyświetli ostrzeżenie o niezaufanym certyfikacie SSL. Wynika to z użycia certyfikatu samopodpisanego. Należy świadomie zaakceptować ryzyko i kontynuować.

Po otwarciu aplikacji należy włączyć tryb VR, klikając przycisk "Enter VR" na środku dolnej części okienka. Następnie należy zezwolić na otworzenie aplikacji VR. Po wejściu w tryb VR użytkownik może korzystać z kontrolerów ruchu do nawigacji w przestrzeni wizualizacji.

### Nawigacja

W systemie dostępne są trzy tryby nawigacji:

- **Swobodne poruszanie się** - ruch użytkownika w przestrzeni fizycznej odwzorowywany jest 1:1 w VR. Tryb naturalny, ale wymaga odpowiednio dużej przestrzeni i niesie ryzyko kolizji.
- **Teleportacja** - użytkownik wskazuje miejsce docelowe i natychmiast się do niego przenosi. Ułatwia przemieszczanie w dużych środowiskach, ale może powodować dezorientację.
- **Łapanie przestrzeni** - użytkownik "chwyta" przestrzeń kontrolerami i przesuwa ją względem siebie. Pozwala precyzyjnie przesuwać, obracać i skalować wizualizację, jednak może utrudniać utrzymanie poczucia skali i spójności względem podłogi.
