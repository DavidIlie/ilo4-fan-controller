interface Hp {
    "@odata.type": string;
    Location: string;
    Type: string;
}

interface Oem {
    Hp: Hp;
}

interface Status {
    Health: string;
    State: string;
}

export interface FanObject {
    CurrentReading: number;
    FanName: string;
    Oem: Oem;
    Status: Status;
    Units: string;
}
