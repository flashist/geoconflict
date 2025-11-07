import { Rectangle } from "@flashist/flibs";
export declare const GameSettings: {
    sizeArea: Rectangle;
    colors: {
        white: number;
        black: number;
        wordwall: {
            yellow: number;
        };
    };
    fonts: {
        main: string;
    };
    gameplay: {
        lettersGrid: {
            size: {
                x: number;
                y: number;
            };
            cell: {
                size: {
                    x: number;
                    y: number;
                };
                padding: {
                    x: number;
                    y: number;
                };
            };
        };
    };
};
