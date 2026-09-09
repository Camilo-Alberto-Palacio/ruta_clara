package com.semillero.rutaclara;

import android.app.PictureInPictureParams;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
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

        // Habilitar entrada automática a Picture-in-Picture en Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAutoEnterEnabled(true)
                    .setAspectRatio(new Rational(9, 16))
                    .build();
                setPictureInPictureParams(params);
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Cuando el ciclista cambia de app o presiona Home, pasar a ventana flotante (Picture-in-Picture)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(9, 16))
                    .build();
                enterPictureInPictureMode(params);
            } catch (Exception ignored) {}
        }
    }
}
