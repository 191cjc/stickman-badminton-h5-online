package §_-2s§
{
   import Playtomic.Link;
   import Playtomic.Log;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import bobby.§_-3h§;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol533")]
   public class §_-1K§ extends §_-07§
   {
      
      public var kongBtn:SimpleButton;
      
      public function §_-1K§()
      {
         addFrameScript(143,this.§_-0C§);
         super();
         §_-5X§ = 30;
      }
      
      private function §_-1§() : *
      {
         §_-0v§.§_-5q§(new §_-4o§(false));
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         §_-3h§.§_-0T§(0);
         §_-3h§.§_-B§("titlemusic.mp3",1,1);
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"SplashLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
      
      internal function §_-0C§() : *
      {
         stop();
         this.§_-1§();
      }
   }
}

