package com.semillero.rutaclara;

import android.media.AudioManager;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Mantener la pantalla encendida permanentemente mientras la aplicación esté en primer plano
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Asegurar que las teclas físicas de volumen controlen el volumen multimedia (STREAM_MUSIC)
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }
}
